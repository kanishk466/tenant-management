// Patient Service — business logic
const prisma = require("../../config/prisma");

class PatientService {
  /**
   * Generate UHID: {HOSPITAL_CODE}-{YEAR}-{SEQUENCE}
   * Example: CCL-2024-00452
   * Sequence resets to 00001 on Jan 1
   */
  async generateUHID(hospitalId) {
    try {
      const currentYear = new Date().getFullYear();

      // Get hospital code
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { code: true },
      });

      if (!hospital) {
        throw new Error("Hospital not found");
      }

      // Get the last patient UHID for this hospital in current year
      // To avoid race conditions, use a transaction with FOR UPDATE equivalent
      const lastPatient = await prisma.$queryRaw`
        SELECT "uhid" 
        FROM "hospital"."patients" 
        WHERE "hospitalId" = ${hospitalId} 
        AND "uhid" LIKE ${`${hospital.code}-${currentYear}-%`}
        ORDER BY "uhid" DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      let nextSequence = 1;

      if (lastPatient && lastPatient.length > 0) {
        // Parse the sequence from the last UHID
        // Format: CCL-2024-00452
        const lastUhid = lastPatient[0].uhid;
        const parts = lastUhid.split("-");
        const lastSeq = parseInt(parts[2], 10);
        nextSequence = lastSeq + 1;
      }

      // Format sequence as 5-digit zero-padded
      const sequenceStr = String(nextSequence).padStart(5, "0");
      const uhid = `${hospital.code}-${currentYear}-${sequenceStr}`;

      return uhid;
    } catch (error) {
      throw new Error(`UHID generation failed: ${error.message}`);
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(hospitalId, userId, patientData) {
    try {
      // Check for duplicate phone + hospitalId
      const existingPatient = await prisma.patient.findFirst({
        where: {
          hospitalId,
          phone: patientData.phone,
          deletedAt: null,
        },
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      });

      if (existingPatient) {
        const error = new Error("Patient with this phone already exists");
        error.code = "PATIENT_DUPLICATE_PHONE";
        error.existingPatient = existingPatient;
        throw error;
      }

      // Generate UHID
      const uhid = await this.generateUHID(hospitalId);

      // Create patient
      const patient = await prisma.patient.create({
        data: {
          hospitalId,
          uhid,
          firstName: patientData.firstName,
          lastName: patientData.lastName || null,
          phone: patientData.phone,
          gender: patientData.gender,
          age: patientData.age || null,
          ageUnit: patientData.ageUnit || "years",
          dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : null,
          salutation: patientData.salutation || null,
          alternatePhone: patientData.alternatePhone || null,
          email: patientData.email || null,
          bloodGroup: patientData.bloodGroup || "UNKNOWN",
          address: patientData.address || null,
          city: patientData.city || null,
          state: patientData.state || null,
          pincode: patientData.pincode || null,
          knownAllergies: patientData.knownAllergies || [],
          chronicConditions: patientData.chronicConditions || [],
          referredBy: patientData.referredBy || null,
          emergencyName: patientData.emergencyName || null,
          emergencyPhone: patientData.emergencyPhone || null,
          emergencyRelation: patientData.emergencyRelation || null,
          createdBy: userId,
        },
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          age: true,
          ageUnit: true,
          bloodGroup: true,
          email: true,
          createdAt: true,
        },
      });

      return patient;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search patients with filters
   */
  async searchPatients(hospitalId, filters) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 50);
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        hospitalId,
        deletedAt: null,
      };

      // If no search params, return empty — don't return all patients
      if (!filters.q && !filters.phone && !filters.uhid) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      if (filters.q) {
        // Search by name (firstName + lastName)
        where.OR = [
          {
            firstName: {
              contains: filters.q,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: filters.q,
              mode: "insensitive",
            },
          },
        ];
      }

      if (filters.phone) {
        where.phone = filters.phone; // exact match
      }

      if (filters.uhid) {
        where.uhid = filters.uhid; // exact match
      }

      // Execute count and find in parallel
      const [items, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            uhid: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            age: true,
            bloodGroup: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.patient.count({ where }),
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
   * Get patient details with recent visits
   */
  async getPatientDetail(hospitalId, patientId) {
    try {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          hospitalId,
          deletedAt: null,
        },
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          phone: true,
          alternatePhone: true,
          email: true,
          gender: true,
          age: true,
          ageUnit: true,
          dateOfBirth: true,
          salutation: true,
          bloodGroup: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          knownAllergies: true,
          chronicConditions: true,
          referredBy: true,
          emergencyName: true,
          emergencyPhone: true,
          emergencyRelation: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!patient) {
        const error = new Error("Patient not found");
        error.code = "PATIENT_NOT_FOUND";
        throw error;
      }

      // Get last 5 visits
      const recentVisits = await prisma.visit.findMany({
        where: {
          hospitalId,
          patientId,
          deletedAt: null,
        },
        select: {
          id: true,
          visitDate: true,
          visitType: true,
          status: true,
          doctor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          visitDate: "desc",
        },
        take: 5,
      });

      return {
        patient,
        recentVisits: recentVisits.map((v) => ({
          id: v.id,
          visitDate: v.visitDate,
          doctorName: v.doctor?.name || "N/A",
          visitType: v.visitType,
          status: v.status,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update patient
   */
  async updatePatient(hospitalId, patientId, updateData) {
    try {
      // Check patient exists and belongs to hospital
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

      // Prevent UHID and hospitalId updates
      delete updateData.uhid;
      delete updateData.hospitalId;

      // Convert dateOfBirth if provided
      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }

      const updated = await prisma.patient.update({
        where: { id: patientId },
        data: updateData,
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          age: true,
          bloodGroup: true,
          email: true,
          updatedAt: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft delete patient
   */
  async deletePatient(hospitalId, patientId) {
    try {
      // Check patient exists
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

      // Check if patient has active visits
      const activeVisits = await prisma.visit.findMany({
        where: {
          hospitalId,
          patientId,
          deletedAt: null,
          status: {
            in: [
              "REGISTERED",
              "WAITING",
              "VITALS_DONE",
              "IN_CONSULTATION",
              "BILLING_PENDING",
            ],
          },
        },
      });

      if (activeVisits.length > 0) {
        const error = new Error(
          "Cannot delete patient with active visits. Please complete or cancel active visits first."
        );
        error.code = "PATIENT_HAS_ACTIVE_VISITS";
        throw error;
      }

      // Soft delete
      const deleted = await prisma.patient.update({
        where: { id: patientId },
        data: {
          deletedAt: new Date(),
        },
        select: {
          id: true,
          uhid: true,
          firstName: true,
          deletedAt: true,
        },
      });

      return deleted;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check for duplicate patients
   */
  async checkDuplicate(hospitalId, phone, firstName) {
    try {
      // Exact match by phone
      const exactMatch = await prisma.patient.findFirst({
        where: {
          hospitalId,
          phone,
          deletedAt: null,
        },
        select: {
          id: true,
          uhid: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          age: true,
          createdAt: true,
        },
      });

      const possibleDuplicates = [];

      if (exactMatch) {
        possibleDuplicates.push({
          ...exactMatch,
          matchType: "EXACT_PHONE",
        });
      }

      // Similar name match (if firstName provided)
      if (firstName && !exactMatch) {
        const similar = await prisma.patient.findMany({
          where: {
            hospitalId,
            firstName: {
              contains: firstName,
              mode: "insensitive",
            },
            deletedAt: null,
          },
          select: {
            id: true,
            uhid: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            age: true,
            createdAt: true,
          },
          take: 5, // limit to 5 similar matches
        });

        similar.forEach((s) => {
          possibleDuplicates.push({
            ...s,
            matchType: "SIMILAR_NAME",
          });
        });
      }

      return possibleDuplicates;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient timeline — visits, documents, prescriptions, vitals
   */
  async getPatientTimeline(hospitalId, patientId) {
    try {
      // Check patient exists
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

      // Get all visits
      const visits = await prisma.visit.findMany({
        where: {
          hospitalId,
          patientId,
          deletedAt: null,
        },
        select: {
          id: true,
          visitDate: true,
          visitType: true,
          status: true,
          chiefComplaint: true,
          doctor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          visitDate: "desc",
        },
      });

      // Get all documents
      const documents = await prisma.patientDocument.findMany({
        where: {
          hospitalId,
          patientId,
        },
        select: {
          id: true,
          documentName: true,
          documentType: true,
          uploadedAt: true,
        },
        orderBy: {
          uploadedAt: "desc",
        },
      });

      // Get all prescriptions
      const prescriptions = await prisma.prescription.findMany({
        where: {
          hospitalId,
          patientId,
        },
        select: {
          id: true,
          createdAt: true,
          doctor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get last 10 vitals
      const vitals = await prisma.vitals.findMany({
        where: {
          hospitalId,
          patientId,
        },
        select: {
          id: true,
          bpSystolic: true,
          bpDiastolic: true,
          pulseRate: true,
          temperature: true,
          spo2: true,
          weight: true,
          recordedAt: true,
        },
        orderBy: {
          recordedAt: "desc",
        },
        take: 10,
      });

      return {
        visits: visits.map((v) => ({
          id: v.id,
          date: v.visitDate,
          type: v.visitType,
          status: v.status,
          complaint: v.chiefComplaint,
          doctorName: v.doctor?.name || "N/A",
        })),
        documents: documents.map((d) => ({
          id: d.id,
          name: d.documentName,
          type: d.documentType,
          uploadedAt: d.uploadedAt,
        })),
        prescriptions: prescriptions.map((p) => ({
          id: p.id,
          date: p.createdAt,
          doctorName: p.doctor?.name || "N/A",
        })),
        vitals: vitals.map((v) => ({
          id: v.id,
          bp: `${v.bpSystolic}/${v.bpDiastolic}`,
          pulse: v.pulseRate,
          temperature: v.temperature,
          spo2: v.spo2,
          weight: v.weight,
          recordedAt: v.recordedAt,
        })),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PatientService();
