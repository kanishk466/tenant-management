// Appointment Controller
const appointmentService = require("./appointment.service");
const {
  validateBookAppointment,
  validateArriveAppointment,
  validateUpdateAppointmentStatus,
  validateGetSlots,
} = require("./appointment.validation");

class AppointmentController {
  /**
   * GET /api/opd/doctors/:doctorId/slots — Get available slots
   */
  async getSlots(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { doctorId } = req.params;
      const { date } = req.query;

      // Validate
      const validation = validateGetSlots(doctorId, date);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const slots = await appointmentService.getAvailableSlots(
        hospitalId,
        doctorId,
        date
      );

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Doctor not found or inactive",
          code: error.code,
        });
      }

      if (error.code === "NO_SCHEDULE_FOR_DAY") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "DOCTOR_ON_LEAVE") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/opd/appointments — Book appointment
   */
  async book(req, res, next) {
    try {
      const { hospitalId, sub: userId } = req.user;
      const appointmentData = req.body;

      // Validate
      const validation = validateBookAppointment(appointmentData);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Book appointment
      const appointment = await appointmentService.bookAppointment(
        hospitalId,
        {
          ...appointmentData,
          bookedByUserId: userId,
        }
      );

      res.status(201).json({
        success: true,
        message: "Appointment booked successfully",
        data: appointment,
      });
    } catch (error) {
      if (error.code === "SLOT_NOT_AVAILABLE") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "APPOINTMENT_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Doctor not found or inactive",
          code: error.code,
        });
      }

      if (error.code === "NO_SCHEDULE_FOR_DAY") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "DOCTOR_ON_LEAVE") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PATCH /api/opd/appointments/:id/arrive — Patient arrived
   */
  async arrive(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: appointmentId } = req.params;

      // Validate
      const validation = validateArriveAppointment(req.body);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const result = await appointmentService.arriveAppointment(
        hospitalId,
        appointmentId
      );

      res.json({
        success: true,
        message: "Patient arrival recorded - visit and token created",
        data: result,
      });
    } catch (error) {
      if (error.code === "APPOINTMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_APPOINTMENT_STATUS") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PATCH /api/opd/appointments/:id/status — Update appointment status
   */
  async updateStatus(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: appointmentId } = req.params;
      const { status, cancellationReason } = req.body;

      // Validate
      const validation = validateUpdateAppointmentStatus({ status, cancellationReason });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await appointmentService.updateAppointmentStatus(
        hospitalId,
        appointmentId,
        status,
        cancellationReason
      );

      res.json({
        success: true,
        message: "Appointment status updated successfully",
        data: updated,
      });
    } catch (error) {
      if (error.code === "APPOINTMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
          code: error.code,
        });
      }

      next(error);
    }
  }
}

module.exports = new AppointmentController();
