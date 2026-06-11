// Doctor Schedule Service — Schedule management logic

const prisma = require("../../config/prisma");

class ScheduleService {
  /**
   * Set/Update doctor schedule with multiple sessions per day support
   * Replaces all existing schedules
   */
  async setSchedule(hospitalId, doctorId, scheduleData) {
    try {
      // Step 1: Verify doctor exists
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

      // Step 2: Check for appointments on affected days (warning only)
      const affectedDays = scheduleData.schedule.map((s) => s.dayOfWeek);
      let warningCount = 0;

      if (affectedDays.length > 0) {
        const futureAppointments = await prisma.appointment.findMany({
          where: {
            doctorId,
            appointmentDate: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            appointmentDate: true,
          },
        });

        // Count appointments on affected days
        futureAppointments.forEach((apt) => {
          const dayOfWeek = new Date(apt.appointmentDate).getDay();
          if (affectedDays.includes(dayOfWeek)) {
            warningCount++;
          }
        });
      }

      // Step 3: Transaction — delete old, insert new
      await prisma.$transaction(async (tx) => {
        // Delete all existing schedules for this doctor
        await tx.doctorSchedule.deleteMany({
          where: {
            doctorId,
          },
        });

        // Insert new schedules
        for (const day of scheduleData.schedule) {
          for (const session of day.sessions) {
            await tx.doctorSchedule.create({
              data: {
                hospitalId,
                doctorId,
                dayOfWeek: day.dayOfWeek,
                startTime: session.startTime,
                endTime: session.endTime,
                slotDurationMin: session.slotDurationMin,
                maxPatients: session.maxPatients,
                isActive: true,
              },
            });
          }
        }
      });

      // Step 4: Fetch and return updated schedule
      const updatedSchedule = await this.getSchedule(hospitalId, doctorId);

      return {
        schedule: updatedSchedule,
        warning:
          warningCount > 0
            ? {
                appointmentsCount: warningCount,
                message: `You have ${warningCount} appointments on days being modified. Schedule change will not affect existing appointments.`,
              }
            : null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get doctor schedule in normalized format (grouped by day)
   */
  async getSchedule(hospitalId, doctorId) {
    try {
      // Fetch doctor with schedules
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
        },
        select: {
          id: true,
          name: true,
          schedules: {
            where: {
              isActive: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Build schedule grouped by day (0-6)
      const schedule = [];

      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        const dayName = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][dayOfWeek];

        const daySessions = doctor.schedules.filter((s) => s.dayOfWeek === dayOfWeek);
        const isWorking = daySessions.length > 0;

        const sessions = daySessions.map((session) => {
          // Calculate total slots: (endTime - startTime) / slotDurationMin
          const [startH, startM] = session.startTime.split(":").map(Number);
          const [endH, endM] = session.endTime.split(":").map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          const totalSlotsPerSession = Math.floor(
            (endMinutes - startMinutes) / session.slotDurationMin
          );

          return {
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
            slotDurationMin: session.slotDurationMin,
            maxPatients: session.maxPatients,
            totalSlotsPerSession,
          };
        });

        // Calculate totals for the day
        let totalDailySlots = 0;
        let totalDailyMaxPatients = 0;

        if (isWorking) {
          totalDailySlots = sessions.reduce((sum, s) => sum + s.totalSlotsPerSession, 0);
          totalDailyMaxPatients = sessions.reduce((sum, s) => sum + s.maxPatients, 0);
        }

        schedule.push({
          dayOfWeek,
          dayName,
          isWorking,
          sessions,
          totalDailySlots,
          totalDailyMaxPatients,
        });
      }

      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        schedule,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get schedule summary (used in doctor list response)
   * Returns true/false for hasSchedule
   */
  async hasSchedule(doctorId) {
    try {
      const count = await prisma.doctorSchedule.count({
        where: {
          doctorId,
          isActive: true,
        },
      });

      return count > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ScheduleService();
