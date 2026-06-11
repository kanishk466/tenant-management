// Doctor Service — Doctor CRUD + Leave management

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../../config/prisma");
const scheduleService = require("./schedule.service");

class DoctorService {
  /**
   * Create new doctor
   */
  async createDoctor(hospitalId, doctorData) {
    try {
      // Step 1: Check if email already exists for this hospital
      const existingDoctor = await prisma.doctor.findFirst({
        where: {
          hospitalId,
          user: {
            email: doctorData.email,
          },
        },
      });

      if (existingDoctor) {
        const error = new Error("Email already registered for this hospital");
        error.code = "DOCTOR_EMAIL_EXISTS";
        throw error;
      }

      // Step 2: Generate temporary password
      const tempPassword = "Doc@" + String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Step 3: Create in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create HospitalUser
        const user = await tx.hospitalUser.create({
          data: {
            hospitalId,
            name: doctorData.name,
            email: doctorData.email,
            phone: doctorData.phone || null,
            role: "DOCTOR",
            passwordHash,
            department: doctorData.department || null,
            isActive: true,
          },
        });

        // Create Doctor profile
        const doctor = await tx.doctor.create({
          data: {
            hospitalId,
            userId: user.id,
            name: doctorData.name,
            email: doctorData.email,
            phone: doctorData.phone || null,
            specialization: doctorData.specialization || null,
            qualification: doctorData.qualification || null,
            registrationNo: doctorData.registrationNo || null,
            department: doctorData.department || null,
            consultationFee: parseFloat(doctorData.consultationFee),
            followUpFee: doctorData.followUpFee ? parseFloat(doctorData.followUpFee) : 0,
            isActive: true,
          },
        });

        return { user, doctor, tempPassword };
      });

      // Step 4: Send welcome email async (non-blocking)
      // TODO: Implement email service
      this.sendWelcomeEmail(result.doctor, result.tempPassword).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });

      // Step 5: Return response
      return {
        id: result.doctor.id,
        name: result.doctor.name,
        email: result.doctor.email,
        specialization: result.doctor.specialization,
        consultationFee: result.doctor.consultationFee,
        isActive: result.doctor.isActive,
        createdAt: result.doctor.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all doctors with filters
   */
  async listDoctors(hospitalId, filters = {}) {
    try {
      const whereClause = {
        hospitalId,
        isActive: filters.isActive !== false, // default to true
      };

      if (filters.specialization) {
        whereClause.specialization = filters.specialization;
      }

      if (filters.department) {
        whereClause.department = filters.department;
      }

      if (filters.q) {
        whereClause.OR = [
          { name: { contains: filters.q, mode: "insensitive" } },
          { specialization: { contains: filters.q, mode: "insensitive" } },
        ];
      }

      const doctors = await prisma.doctor.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          specialization: true,
          qualification: true,
          consultationFee: true,
          followUpFee: true,
          department: true,
          registrationNo: true,
          isActive: true,
          user: {
            select: {
              email: true,
              phone: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Add hasSchedule for each doctor
      const doctorList = await Promise.all(
        doctors.map(async (doctor) => ({
          id: doctor.id,
          name: doctor.name,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          consultationFee: doctor.consultationFee,
          followUpFee: doctor.followUpFee,
          department: doctor.department,
          registrationNo: doctor.registrationNo,
          isActive: doctor.isActive,
          user: doctor.user,
          hasSchedule: await scheduleService.hasSchedule(doctor.id),
        }))
      );

      return doctorList;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single doctor detail
   */
  async getDoctorDetail(hospitalId, doctorId) {
    try {
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          specialization: true,
          qualification: true,
          registrationNo: true,
          department: true,
          consultationFee: true,
          followUpFee: true,
          signatureUrl: true,
          isActive: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              phone: true,
              lastLoginAt: true,
            },
          },
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Get schedule
      const schedule = await scheduleService.getSchedule(hospitalId, doctorId);

      // Get upcoming leaves (next 30 days)
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const upcomingLeaves = await prisma.doctorLeave.findMany({
        where: {
          doctorId,
          leaveDate: {
            gte: today,
            lte: thirtyDaysLater,
          },
        },
        select: {
          id: true,
          leaveDate: true,
          reason: true,
        },
        orderBy: { leaveDate: "asc" },
      });

      // Get stats
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const todayPatients = await prisma.visit.count({
        where: {
          doctorId,
          visitDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      });

      const thisMonthPatients = await prisma.visit.count({
        where: {
          doctorId,
          visitDate: {
            gte: thisMonthStart,
            lte: thisMonthEnd,
          },
        },
      });

      return {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          registrationNo: doctor.registrationNo,
          department: doctor.department,
          consultationFee: doctor.consultationFee,
          followUpFee: doctor.followUpFee,
          signatureUrl: doctor.signatureUrl,
          isActive: doctor.isActive,
          createdAt: doctor.createdAt,
          user: doctor.user,
        },
        schedule: schedule.schedule,
        upcomingLeaves,
        stats: {
          todayPatients,
          thisMonthPatients,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update doctor profile
   */
  async updateDoctor(hospitalId, doctorId, updateData) {
    try {
      // Verify doctor exists
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Special handling for isActive: false
      let warning = null;
      if (updateData.isActive === false) {
        const futureAppointments = await prisma.appointment.findMany({
          where: {
            doctorId,
            appointmentDate: {
              gte: new Date(),
            },
            status: {
              in: ["SCHEDULED", "CONFIRMED", "ARRIVED"],
            },
          },
          select: { id: true },
        });

        if (futureAppointments.length > 0) {
          warning = {
            appointmentsCount: futureAppointments.length,
            message: `Doctor has ${futureAppointments.length} upcoming appointments. Deactivating will not cancel them automatically.`,
          };
        }
      }

      // Update doctor
      const updatedDoctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: updateData,
      });

      return {
        doctor: updatedDoctor,
        warning,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark single leave
   */
  async markLeave(hospitalId, doctorId, leaveDate, reason = null) {
    try {
      // Step 1: Check if past date
      const dateObj = new Date(leaveDate);
      dateObj.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateObj < today) {
        const error = new Error("Cannot mark leave for past dates");
        error.code = "CANNOT_MARK_PAST_LEAVE";
        throw error;
      }

      // Step 2: Check if already leave marked
      const existingLeave = await prisma.doctorLeave.findFirst({
        where: {
          doctorId,
          leaveDate: dateObj,
        },
      });

      if (existingLeave) {
        const error = new Error("Leave already marked for this date");
        error.code = "LEAVE_ALREADY_EXISTS";
        throw error;
      }

      // Step 3: Count appointments on this date
      const startOfDay = new Date(dateObj);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const appointmentCount = await prisma.appointment.count({
        where: {
          doctorId,
          appointmentDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "ARRIVED"],
          },
        },
      });

      // Step 4: Create leave
      const leave = await prisma.doctorLeave.create({
        data: {
          hospitalId,
          doctorId,
          leaveDate: dateObj,
          reason: reason || null,
        },
      });

      // Step 5: Return with warning if appointments exist
      const response = {
        leave: {
          id: leave.id,
          leaveDate: leave.leaveDate,
          reason: leave.reason,
        },
      };

      if (appointmentCount > 0) {
        response.warning = {
          appointmentsCount: appointmentCount,
          message: `${appointmentCount} appointments exist on this date. Please review and inform patients.`,
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark bulk leave (multiple days)
   */
  async markBulkLeave(hospitalId, doctorId, fromDate, toDate, reason = null) {
    try {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(0, 0, 0, 0);

      // Step 1: Validate date range
      if (from > to) {
        const error = new Error("fromDate must be <= toDate");
        error.code = "INVALID_DATE_RANGE";
        throw error;
      }

      // Step 2: Check max 30 days
      const daysDiff = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 30) {
        const error = new Error("Bulk leave cannot exceed 30 days");
        error.code = "BULK_LEAVE_LIMIT_EXCEEDED";
        throw error;
      }

      // Step 3: Get schedule to filter working days only
      const schedules = await prisma.doctorSchedule.findMany({
        where: {
          doctorId,
          isActive: true,
        },
        select: { dayOfWeek: true },
        distinct: ["dayOfWeek"],
      });

      const workingDays = new Set(schedules.map((s) => s.dayOfWeek));

      // Step 4: Generate leaves for working days only
      const leavesToCreate = [];
      const current = new Date(from);

      while (current <= to) {
        const dayOfWeek = current.getDay();

        // Only create leave for working days
        if (workingDays.has(dayOfWeek)) {
          leavesToCreate.push({
            hospitalId,
            doctorId,
            leaveDate: new Date(current),
            reason: reason || null,
          });
        }

        current.setDate(current.getDate() + 1);
      }

      // Step 5: Count appointments in this range
      const appointmentCount = await prisma.appointment.count({
        where: {
          doctorId,
          appointmentDate: {
            gte: from,
            lte: to,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "ARRIVED"],
          },
        },
      });

      // Step 6: Batch create, skip duplicates
      const createdLeaves = [];

      for (const leave of leavesToCreate) {
        try {
          const created = await prisma.doctorLeave.create({
            data: leave,
          });
          createdLeaves.push(created);
        } catch (error) {
          // Skip if already exists (unique constraint)
          if (error.code !== "P2002") {
            throw error;
          }
        }
      }

      // Step 7: Return response
      const response = {
        leaves: createdLeaves.map((l) => ({
          id: l.id,
          leaveDate: l.leaveDate,
          reason: l.reason,
        })),
        createdCount: createdLeaves.length,
      };

      if (appointmentCount > 0) {
        response.warning = {
          appointmentsCount: appointmentCount,
          message: `${appointmentCount} appointments exist in this date range. Please review and inform patients.`,
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel leave
   */
  async cancelLeave(hospitalId, doctorId, leaveId) {
    try {
      const leave = await prisma.doctorLeave.findFirst({
        where: {
          id: leaveId,
          doctorId,
          hospitalId,
        },
      });

      if (!leave) {
        const error = new Error("Leave not found");
        error.code = "LEAVE_NOT_FOUND";
        throw error;
      }

      // Check if past date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leaveDate = new Date(leave.leaveDate);
      leaveDate.setHours(0, 0, 0, 0);

      if (leaveDate < today) {
        const error = new Error("Cannot cancel past leave");
        error.code = "CANNOT_CANCEL_PAST_LEAVE";
        throw error;
      }

      // Delete leave
      await prisma.doctorLeave.delete({
        where: { id: leaveId },
      });

      return {
        success: true,
        message: "Leave cancelled successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get doctor leaves
   */
  async getLeaves(hospitalId, doctorId, fromDate = null, toDate = null) {
    try {
      const from = fromDate ? new Date(fromDate) : new Date();
      from.setHours(0, 0, 0, 0);

      const to = toDate
        ? new Date(toDate)
        : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
      to.setHours(23, 59, 59);

      const leaves = await prisma.doctorLeave.findMany({
        where: {
          doctorId,
          hospitalId,
          leaveDate: {
            gte: from,
            lte: to,
          },
        },
        select: {
          id: true,
          leaveDate: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { leaveDate: "asc" },
      });

      return leaves;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send welcome email (async helper)
   */
  async sendWelcomeEmail(doctor, tempPassword) {
    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log(`
        Welcome Email would be sent to: ${doctor.email}
        Subject: Your HIS account is ready
        Temporary Password: ${tempPassword}
        Login URL: ${process.env.LOGIN_URL || "https://yourhis.com/login"}
      `);
    } catch (error) {
      console.error("Email sending failed:", error);
    }
  }
}

module.exports = new DoctorService();
