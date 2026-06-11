// Visit Service — business logic
const prisma = require("../../../config/prisma");
const { isValidStatusTransition } = require("./visit.validation");

class VisitService {
  /**
   * Generate visit number: V-{YEAR}-{6-digit-sequence}
   * Example: V-2024-001042
   */
  async generateVisitNumber(hospitalId) {
    try {
      const currentYear = new Date().getFullYear();

      // Get the last visit for this hospital in current year
      const lastVisit = await prisma.$queryRaw`
        SELECT "visitNumber" 
        FROM "hospital"."visits" 
        WHERE "hospitalId" = ${hospitalId} 
        AND "visitNumber" LIKE ${`V-${currentYear}-%`}
        ORDER BY "visitNumber" DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      let nextSequence = 1;

      if (lastVisit && lastVisit.length > 0) {
        // Parse sequence from V-2024-001042
        const parts = lastVisit[0].visitNumber.split("-");
        const lastSeq = parseInt(parts[2], 10);
        nextSequence = lastSeq + 1;
      }

      // Format sequence as 6-digit zero-padded
      const sequenceStr = String(nextSequence).padStart(6, "0");
      const visitNumber = `V-${currentYear}-${sequenceStr}`;

      return visitNumber;
    } catch (error) {
      throw new Error(`Visit number generation failed: ${error.message}`);
    }
  }

  /**
   * Generate token number: per doctor, per day
   * Emergency visits get tokenNumber = 0 (sorts first)
   */
  async generateTokenNumber(hospitalId, doctorId, isEmergency) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      if (isEmergency) {
        return 0; // Emergency tokens always priority
      }

      // Get highest token number for this doctor today (excluding emergencies)
      const lastToken = await prisma.$queryRaw`
        SELECT "tokenNumber"
        FROM "hospital"."tokens"
        WHERE "hospitalId" = ${hospitalId}
          AND "doctorId" = ${doctorId}
          AND "tokenDate" >= ${startOfDay}
          AND "tokenDate" < ${endOfDay}
          AND "tokenNumber" > 0
        ORDER BY "tokenNumber" DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      let nextTokenNumber = 1;

      if (lastToken && lastToken.length > 0) {
        nextTokenNumber = lastToken[0].tokenNumber + 1;
      }

      return nextTokenNumber;
    } catch (error) {
      throw new Error(`Token number generation failed: ${error.message}`);
    }
  }

  /**
   * Create visit + token (in transaction)
   */
  async createVisit(hospitalId, userId, visitData) {
    try {
      const { patientId, doctorId, visitType, chiefComplaint, referredBy, isEmergency = false, appointmentId } = visitData;

      // Step 1: Check patient exists and belongs to hospital
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          hospitalId,
          deletedAt: null,
        },
      });

      if (!patient) {
        const error = new Error("Patient not found");
        error.code = "PATIENT_NOT_FOUND";
        throw error;
      }

      // Step 2: Check doctor exists and active
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
          isActive: true,
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found or inactive");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Step 3: Duplicate check — same patient + doctor + ACTIVE visit today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existingActiveVisit = await prisma.visit.findFirst({
        where: {
          hospitalId,
          patientId,
          doctorId,
          visitDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ["REGISTERED", "WAITING", "VITALS_DONE", "IN_CONSULTATION"],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          visitNumber: true,
          status: true,
        },
      });

      if (existingActiveVisit) {
        const error = new Error(`Patient already has an active visit with this doctor today`);
        error.code = "VISIT_ALREADY_EXISTS";
        error.existingVisit = existingActiveVisit;
        throw error;
      }

      // Step 4: Generate visit number
      const visitNumber = await this.generateVisitNumber(hospitalId);

      // Step 5: Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate token number within transaction
        const tokenNumber = await this.generateTokenNumber(hospitalId, doctorId, isEmergency);

        // Create visit
        const newVisit = await tx.visit.create({
          data: {
            hospitalId,
            patientId,
            doctorId,
            visitNumber,
            visitDate: new Date(),
            visitType,
            status: "REGISTERED",
            chiefComplaint: chiefComplaint || null,
            referredBy: referredBy || null,
            isEmergency,
            registeredBy: userId,
          },
          select: {
            id: true,
            visitNumber: true,
            visitType: true,
            status: true,
            patientId: true,
            doctorId: true,
            createdAt: true,
          },
        });

        // Create token
        const newToken = await tx.token.create({
          data: {
            hospitalId,
            visitId: newVisit.id,
            doctorId,
            tokenNumber,
            tokenDate: new Date(),
            status: "WAITING",
          },
          select: {
            id: true,
            tokenNumber: true,
            status: true,
            doctorId: true,
          },
        });

        // Link appointment if provided
        if (appointmentId) {
          await tx.appointment.update({
            where: { id: appointmentId },
            data: {
              visitId: newVisit.id,
              status: "ARRIVED",
            },
          });
        }

        return { visit: newVisit, token: newToken };
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visits with filters
   */
  async getVisits(hospitalId, filters) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        hospitalId,
        deletedAt: null,
      };

      // Date filter is critical — default to today if not provided
      let date = filters.date ? new Date(filters.date) : new Date();
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      where.visitDate = {
        gte: startOfDay,
        lt: endOfDay,
      };

      if (filters.doctorId) {
        where.doctorId = filters.doctorId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.patientId) {
        where.patientId = filters.patientId;
      }

      if (filters.visitType) {
        where.visitType = filters.visitType;
      }

      // Execute count and find in parallel
      const [items, total] = await Promise.all([
        prisma.visit.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            visitNumber: true,
            visitDate: true,
            visitType: true,
            status: true,
            isEmergency: true,
            patient: {
              select: {
                id: true,
                uhid: true,
                firstName: true,
                lastName: true,
              },
            },
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
            token: {
              select: {
                tokenNumber: true,
              },
            },
          },
          orderBy: [
            { isEmergency: "desc" }, // Emergencies first
            { createdAt: "asc" }, // Then by creation time
          ],
        }),
        prisma.visit.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get visit detail with related data
   */
  async getVisitDetail(hospitalId, visitId) {
    try {
      const visit = await prisma.visit.findFirst({
        where: {
          id: visitId,
          hospitalId,
          deletedAt: null,
        },
        select: {
          id: true,
          visitNumber: true,
          visitDate: true,
          visitType: true,
          status: true,
          isEmergency: true,
          chiefComplaint: true,
          referredBy: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              uhid: true,
              firstName: true,
              lastName: true,
              age: true,
              gender: true,
              knownAllergies: true,
              chronicConditions: true,
              bloodGroup: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
          token: {
            select: {
              id: true,
              tokenNumber: true,
              status: true,
              calledAt: true,
              consultationStart: true,
              consultationEnd: true,
            },
          },
          vitals: {
            select: {
              id: true,
              bpSystolic: true,
              bpDiastolic: true,
              pulseRate: true,
              temperature: true,
              spo2: true,
              weight: true,
              height: true,
              bmi: true,
              recordedAt: true,
            },
          },
        },
      });

      if (!visit) {
        const error = new Error("Visit not found");
        error.code = "VISIT_NOT_FOUND";
        throw error;
      }

      return visit;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update visit status with validation
   * Internal use only — not called directly by frontend
   */
  async updateVisitStatus(hospitalId, visitId, newStatus) {
    try {
      const visit = await prisma.visit.findFirst({
        where: {
          id: visitId,
          hospitalId,
          deletedAt: null,
        },
      });

      if (!visit) {
        const error = new Error("Visit not found");
        error.code = "VISIT_NOT_FOUND";
        throw error;
      }

      // Check if COMPLETED — cannot modify
      if (visit.status === "COMPLETED") {
        const error = new Error("Cannot modify a completed visit");
        error.code = "COMPLETED_VISIT_IMMUTABLE";
        throw error;
      }

      // Validate status transition
      if (!isValidStatusTransition(visit.status, newStatus)) {
        const error = new Error(
          `Invalid status transition from ${visit.status} to ${newStatus}`
        );
        error.code = "INVALID_STATUS_TRANSITION";
        throw error;
      }

      const updated = await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: newStatus,
        },
        select: {
          id: true,
          visitNumber: true,
          status: true,
          updatedAt: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel visit
   */
  async cancelVisit(hospitalId, visitId, cancellationReason = null) {
    try {
      const visit = await prisma.visit.findFirst({
        where: {
          id: visitId,
          hospitalId,
          deletedAt: null,
        },
      });

      if (!visit) {
        const error = new Error("Visit not found");
        error.code = "VISIT_NOT_FOUND";
        throw error;
      }

      // Cannot cancel if in consultation or consultation done
      if (["IN_CONSULTATION", "CONSULTATION_DONE", "COMPLETED"].includes(visit.status)) {
        const error = new Error(
          `Cannot cancel visit with status ${visit.status}. Only pending visits can be cancelled.`
        );
        error.code = "VISIT_CANCELLATION_NOT_ALLOWED";
        throw error;
      }

      // Transaction: cancel visit + token + appointment
      const result = await prisma.$transaction(async (tx) => {
        // Update visit status
        const cancelledVisit = await tx.visit.update({
          where: { id: visitId },
          data: {
            status: "CANCELLED",
          },
          select: {
            id: true,
            visitNumber: true,
            status: true,
          },
        });

        // Update token status
        await tx.token.updateMany({
          where: { visitId },
          data: {
            status: "CANCELLED",
          },
        });

        // Cancel appointment if linked
        await tx.appointment.updateMany({
          where: {
            visitId,
          },
          data: {
            status: "CANCELLED",
            cancellationReason,
          },
        });

        return cancelledVisit;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new VisitService();
