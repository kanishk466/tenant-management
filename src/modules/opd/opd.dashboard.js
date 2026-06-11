// OPD Dashboard Service — aggregated data
const prisma = require("../../../config/prisma");

class OPDDashboardService {
  /**
   * Get OPD dashboard — all data in parallel
   * Role-based filtering applied
   */
  async getDashboard(hospitalId, userId, userRole) {
    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get user's doctor profile if DOCTOR role
      let doctorId = null;
      if (userRole === "DOCTOR") {
        const doctor = await prisma.doctor.findFirst({
          where: {
            hospitalId,
            userId,
          },
          select: {
            id: true,
          },
        });
        doctorId = doctor?.id;
      }

      // Execute all queries in parallel
      const [visitsStats, queueSummary, appointments, liveQueue, pendingBills, collections] =
        await Promise.all([
          // Query 1: Today's visits by status
          this.getVisitsStats(hospitalId, doctorId, startOfDay, endOfDay),

          // Query 2: Queue summary by doctor
          this.getQueueSummary(hospitalId, doctorId, startOfDay, endOfDay),

          // Query 3: Today's appointments (first 10)
          this.getTodaysAppointments(hospitalId, doctorId, startOfDay, endOfDay),

          // Query 4: Live queue (WAITING tokens)
          this.getLiveQueue(hospitalId, doctorId, startOfDay, endOfDay),

          // Query 5: Pending bills count
          this.getPendingBills(hospitalId),

          // Query 6: Today's collections
          this.getTodaysCollections(hospitalId, startOfDay, endOfDay),
        ]);

      // Build response based on role
      const dashboard = {
        date: today.toISOString().split("T")[0],
        role: userRole,
        visits: visitsStats,
        queue: queueSummary,
        appointments,
        liveQueue,
      };

      // Add billing info if not RECEPTIONIST
      if (!["RECEPTIONIST", "NURSE"].includes(userRole)) {
        dashboard.billing = {
          pendingBills: pendingBills,
          todaysCollection: collections,
        };
      }

      return dashboard;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query 1: Today's visits by status
   */
  async getVisitsStats(hospitalId, doctorId, startOfDay, endOfDay) {
    try {
      const where = {
        hospitalId,
        visitDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        deletedAt: null,
      };

      if (doctorId) {
        where.doctorId = doctorId;
      }

      const visits = await prisma.visit.findMany({
        where,
        select: {
          status: true,
        },
      });

      // Count by status
      const counts = {
        registered: 0,
        waiting: 0,
        inConsultation: 0,
        consultationDone: 0,
        billingPending: 0,
        completed: 0,
        cancelled: 0,
      };

      visits.forEach((v) => {
        if (v.status === "REGISTERED") counts.registered++;
        else if (v.status === "WAITING") counts.waiting++;
        else if (v.status === "IN_CONSULTATION") counts.inConsultation++;
        else if (v.status === "CONSULTATION_DONE") counts.consultationDone++;
        else if (v.status === "BILLING_PENDING") counts.billingPending++;
        else if (v.status === "COMPLETED") counts.completed++;
        else if (v.status === "CANCELLED") counts.cancelled++;
      });

      return {
        total: visits.length,
        ...counts,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query 2: Queue summary (waiting count per doctor)
   */
  async getQueueSummary(hospitalId, doctorId, startOfDay, endOfDay) {
    try {
      const where = {
        hospitalId,
        tokenDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      };

      if (doctorId) {
        where.doctorId = doctorId;
      }

      const tokens = await prisma.token.findMany({
        where,
        select: {
          doctorId: true,
          status: true,
          doctor: {
            select: {
              name: true,
            },
          },
        },
      });

      // Group by doctor
      const queueByDoctor = {};
      tokens.forEach((t) => {
        if (!queueByDoctor[t.doctorId]) {
          queueByDoctor[t.doctorId] = {
            doctorName: t.doctor.name,
            waiting: 0,
            inConsultation: 0,
            done: 0,
          };
        }

        if (t.status === "WAITING") queueByDoctor[t.doctorId].waiting++;
        else if (t.status === "IN_CONSULTATION") queueByDoctor[t.doctorId].inConsultation++;
        else if (t.status === "DONE") queueByDoctor[t.doctorId].done++;
      });

      return Object.values(queueByDoctor);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query 3: Today's appointments
   */
  async getTodaysAppointments(hospitalId, doctorId, startOfDay, endOfDay) {
    try {
      const where = {
        hospitalId,
        appointmentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          in: ["SCHEDULED", "CONFIRMED", "ARRIVED"],
        },
      };

      if (doctorId) {
        where.doctorId = doctorId;
      }

      const appointments = await prisma.appointment.findMany({
        where,
        select: {
          id: true,
          appointmentTime: true,
          status: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          appointmentTime: "asc",
        },
        take: 10,
      });

      return appointments.map((apt) => ({
        id: apt.id,
        time: apt.appointmentTime,
        status: apt.status,
        patientName: `${apt.patient.firstName} ${apt.patient.lastName || ""}`.trim(),
        patientPhone: apt.patient.phone,
        doctorName: apt.doctor.name,
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query 4: Live queue (WAITING status)
   */
  async getLiveQueue(hospitalId, doctorId, startOfDay, endOfDay) {
    try {
      const where = {
        hospitalId,
        tokenDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: "WAITING",
      };

      if (doctorId) {
        where.doctorId = doctorId;
      }

      const tokens = await prisma.token.findMany({
        where,
        select: {
          tokenNumber: true,
          doctor: {
            select: {
              name: true,
            },
          },
          visit: {
            select: {
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: [{ tokenNumber: "asc" }],
        take: 10,
      });

      return tokens.map((t) => ({
        tokenNumber: t.tokenNumber,
        doctorName: t.doctor.name,
        patientName: `${t.visit.patient.firstName} ${t.visit.patient.lastName || ""}`.trim(),
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query 5: Pending bills count
   */
  async getPendingBills(hospitalId) {
    try {
      const count = await prisma.bill.count({
        where: {
          hospitalId,
          status: {
            in: ["DRAFT", "PENDING"],
          },
        },
      });

      return count;
    } catch (error) {
      return 0; // If bill table doesn't exist yet
    }
  }

  /**
   * Query 6: Today's collections (total paid)
   */
  async getTodaysCollections(hospitalId, startOfDay, endOfDay) {
    try {
      const result = await prisma.bill.aggregate({
        where: {
          hospitalId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: "PAID",
        },
        _sum: {
          totalAmount: true,
        },
      });

      return result._sum.totalAmount || 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new OPDDashboardService();
