// Appointment Service — slot management + booking
const prisma = require("../../../config/prisma");

class AppointmentService {
  /**
   * Get available slots for doctor on a specific date
   */
  async getAvailableSlots(hospitalId, doctorId, appointmentDate) {
    try {
      const queryDate = new Date(appointmentDate);

      // Step 1: Get doctor + schedule
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          hospitalId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          consultationFee: true,
          schedules: true,
        },
      });

      if (!doctor) {
        const error = new Error("Doctor not found or inactive");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
      }

      // Step 2: Check if doctor has schedule for this day of week
      const dayOfWeek = queryDate.getDay();
      const daySchedule = doctor.schedules?.find((s) => s.dayOfWeek === dayOfWeek);

      if (!daySchedule) {
        const error = new Error("Doctor has no schedule for this day");
        error.code = "NO_SCHEDULE_FOR_DAY";
        throw error;
      }

      // Step 3: Check if doctor is on leave
      const startOfDay = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth(),
        queryDate.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const doctorLeave = await prisma.doctorLeave.findFirst({
        where: {
          doctorId,
          leaveDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      if (doctorLeave) {
        const error = new Error("Doctor is on leave on this date");
        error.code = "DOCTOR_ON_LEAVE";
        throw error;
      }

      // Step 4: Generate time slots
      const [startHour, startMin] = daySchedule.startTime.split(":").map(Number);
      const [endHour, endMin] = daySchedule.endTime.split(":").map(Number);
      const slotDuration = daySchedule.slotDurationMin || 15;
      const maxPatients = daySchedule.maxPatients || 4;

      const slots = [];
      let currentDate = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth(),
        queryDate.getDate(),
        startHour,
        startMin
      );
      const endDate = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth(),
        queryDate.getDate(),
        endHour,
        endMin
      );

      while (currentDate < endDate) {
        const hours = String(currentDate.getHours()).padStart(2, "0");
        const minutes = String(currentDate.getMinutes()).padStart(2, "0");
        slots.push({
          time: `${hours}:${minutes}`,
          dateTime: new Date(currentDate),
        });
        currentDate.setMinutes(currentDate.getMinutes() + slotDuration);
      }

      // Step 5: Check existing appointments per slot
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          hospitalId,
          doctorId,
          appointmentDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "ARRIVED"],
          },
        },
        select: {
          appointmentTime: true,
        },
      });

      // Count appointments per time slot
      const appointmentsByTime = {};
      existingAppointments.forEach((apt) => {
        if (!appointmentsByTime[apt.appointmentTime]) {
          appointmentsByTime[apt.appointmentTime] = 0;
        }
        appointmentsByTime[apt.appointmentTime]++;
      });

      // Step 6: Build response with availability
      const slotList = slots.map((slot) => {
        const booked = appointmentsByTime[slot.time] || 0;
        return {
          time: slot.time,
          available: booked < maxPatients,
          booked,
          max: maxPatients,
        };
      });

      return {
        date: appointmentDate,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          consultationFee: doctor.consultationFee,
        },
        slots: slotList,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Book appointment
   */
  async bookAppointment(hospitalId, appointmentData) {
    try {
      const {
        patientId,
        doctorId,
        appointmentDate,
        appointmentTime,
        visitType = "OPD",
        reason,
        source = "COUNTER",
        bookedByUserId,
      } = appointmentData;

      // Step 1: Check slot availability (reuse slots logic)
      const slotsResponse = await this.getAvailableSlots(
        hospitalId,
        doctorId,
        appointmentDate
      );

      const selectedSlot = slotsResponse.slots.find(
        (s) => s.time === appointmentTime
      );

      if (!selectedSlot || !selectedSlot.available) {
        const error = new Error("Selected slot is not available");
        error.code = "SLOT_NOT_AVAILABLE";
        throw error;
      }

      // Step 2: Check duplicate appointment
      const startOfDay = new Date(
        new Date(appointmentDate).getFullYear(),
        new Date(appointmentDate).getMonth(),
        new Date(appointmentDate).getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          hospitalId,
          patientId,
          doctorId,
          appointmentDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED"],
          },
        },
      });

      if (existingAppointment) {
        const error = new Error(
          "Patient already has an appointment with this doctor on this date"
        );
        error.code = "APPOINTMENT_ALREADY_EXISTS";
        throw error;
      }

      // Step 3: Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          hospitalId,
          patientId,
          doctorId,
          appointmentDate: new Date(appointmentDate),
          appointmentTime,
          visitType,
          reason: reason || null,
          source,
          status: "SCHEDULED",
          bookedBy: bookedByUserId || null,
        },
        select: {
          id: true,
          appointmentDate: true,
          appointmentTime: true,
          status: true,
          patient: {
            select: {
              id: true,
              uhid: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              consultationFee: true,
            },
          },
          createdAt: true,
        },
      });

      // Step 4: Trigger notification (async - not awaited)
      // In production: queue to message service
      // this.triggerNotification(appointment, "CONFIRMATION");

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Patient arrived — create visit + token automatically
   */
  async arriveAppointment(hospitalId, appointmentId) {
    try {
      // Step 1: Fetch appointment
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          hospitalId,
        },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          appointmentDate: true,
          visitType: true,
          reason: true,
          status: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!appointment) {
        const error = new Error("Appointment not found");
        error.code = "APPOINTMENT_NOT_FOUND";
        throw error;
      }

      // Appointment must be SCHEDULED or CONFIRMED
      if (!["SCHEDULED", "CONFIRMED"].includes(appointment.status)) {
        const error = new Error(
          `Cannot mark arrived - appointment status is ${appointment.status}`
        );
        error.code = "INVALID_APPOINTMENT_STATUS";
        throw error;
      }

      // Step 2: Create visit + token via transaction
      // This will internally create visit and token
      const visitService = require("../visit/visit.service");

      const result = await prisma.$transaction(async (tx) => {
        // Update appointment
        const updatedAppointment = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "ARRIVED",
            arrivedAt: new Date(),
          },
          select: {
            id: true,
            appointmentDate: true,
            appointmentTime: true,
            status: true,
          },
        });

        // Generate visit number
        const visitNumber = await visitService.generateVisitNumber(hospitalId);

        // Generate token number
        const tokenNumber = await visitService.generateTokenNumber(
          hospitalId,
          appointment.doctorId,
          false // not emergency
        );

        // Create visit
        const newVisit = await tx.visit.create({
          data: {
            hospitalId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            visitNumber,
            visitDate: new Date(),
            visitType: appointment.visitType || "OPD",
            status: "REGISTERED",
            chiefComplaint: appointment.reason || null,
            isEmergency: false,
            registeredBy: null,
          },
          select: {
            id: true,
            visitNumber: true,
            visitType: true,
            status: true,
          },
        });

        // Create token
        const newToken = await tx.token.create({
          data: {
            hospitalId,
            visitId: newVisit.id,
            doctorId: appointment.doctorId,
            tokenNumber,
            tokenDate: new Date(),
            status: "WAITING",
          },
          select: {
            id: true,
            tokenNumber: true,
            status: true,
          },
        });

        // Link visit to appointment
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            visitId: newVisit.id,
          },
        });

        return {
          appointment: updatedAppointment,
          visit: newVisit,
          token: newToken,
        };
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(hospitalId, appointmentId, newStatus, cancellationReason = null) {
    try {
      // Fetch appointment
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          hospitalId,
        },
      });

      if (!appointment) {
        const error = new Error("Appointment not found");
        error.code = "APPOINTMENT_NOT_FOUND";
        throw error;
      }

      // Update based on status
      const updateData = {
        status: newStatus,
      };

      if (newStatus === "CANCELLED") {
        updateData.cancellationReason = cancellationReason;
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
        select: {
          id: true,
          appointmentDate: true,
          status: true,
          cancellationReason: true,
          updatedAt: true,
        },
      });

      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark appointments as NO_SHOW (end of day cron job)
   */
  async markNoShowAppointments() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Find appointments that are still SCHEDULED/CONFIRMED and date has passed
      const result = await prisma.appointment.updateMany({
        where: {
          appointmentDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED"],
          },
        },
        data: {
          status: "NO_SHOW",
        },
      });

      return {
        updated: result.count,
        date: startOfDay,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AppointmentService();
