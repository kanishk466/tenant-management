// Doctor Controller — HTTP request handlers

const doctorService = require("./doctor.service");
const scheduleService = require("./schedule.service");
const {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateSchedule,
  validateLeaveDate,
  validateBulkLeave,
  validateListDoctors,
} = require("./doctor.validation");

class DoctorController {
  /**
   * POST /api/doctors — Create new doctor
   */
  async createDoctor(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const data = req.body;

      // Validate
      const validation = validateCreateDoctor(data);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Create doctor
      const doctor = await doctorService.createDoctor(hospitalId, data);

      res.status(201).json({
        success: true,
        message: "Doctor added. Login credentials sent to email.",
        data: doctor,
      });
    } catch (error) {
      if (error.code === "DOCTOR_EMAIL_EXISTS") {
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
   * GET /api/doctors — List all doctors
   */
  async listDoctors(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const query = req.query;

      // Validate query
      const validation = validateListDoctors(query);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Parse isActive
      const filters = {};
      if (query.isActive !== undefined) {
        filters.isActive = query.isActive === "true";
      } else {
        filters.isActive = true; // default
      }

      if (query.specialization) {
        filters.specialization = query.specialization;
      }

      if (query.department) {
        filters.department = query.department;
      }

      if (query.q) {
        filters.q = query.q;
      }

      // List doctors
      const doctors = await doctorService.listDoctors(hospitalId, filters);

      res.json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/doctors/:id — Get doctor detail
   */
  async getDoctorDetail(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;

      const detail = await doctorService.getDoctorDetail(hospitalId, id);

      res.json({
        success: true,
        data: detail,
      });
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PATCH /api/doctors/:id — Update doctor profile
   */
  async updateDoctor(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;
      const data = req.body;

      // Validate
      const validation = validateUpdateDoctor(data);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Update doctor
      const result = await doctorService.updateDoctor(hospitalId, id, data);

      const response = {
        success: true,
        data: result.doctor,
      };

      if (result.warning) {
        response.warning = result.warning;
      }

      res.json(response);
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PUT /api/doctors/:id/schedule — Set doctor schedule
   */
  async setSchedule(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;
      const data = req.body;

      // Validate
      const validation = validateSchedule(data);
      if (!validation.isValid) {
        // Check for overlap error in validations
        const overlapError = validation.errors.find(
          (e) => typeof e === "object" && e.code === "SCHEDULE_SESSION_OVERLAP"
        );
        if (overlapError) {
          return res.status(422).json({
            success: false,
            message: overlapError.message,
            code: "SCHEDULE_SESSION_OVERLAP",
          });
        }

        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors.filter((e) => typeof e === "string"),
        });
      }

      // Set schedule
      const result = await scheduleService.setSchedule(hospitalId, id, data);

      const response = {
        success: true,
        data: result.schedule,
      };

      if (result.warning) {
        response.warning = result.warning;
      }

      res.json(response);
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/doctors/:id/schedule — Get doctor schedule
   */
  async getSchedule(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;

      const schedule = await scheduleService.getSchedule(hospitalId, id);

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/doctors/:id/leaves — Mark single leave
   */
  async markLeave(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;
      const { leaveDate, reason } = req.body;

      // Validate
      const validation = validateLeaveDate(leaveDate);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Mark leave
      const result = await doctorService.markLeave(hospitalId, id, leaveDate, reason);

      const response = {
        success: true,
        data: result.leave,
      };

      if (result.warning) {
        response.warning = result.warning;
      }

      res.status(201).json(response);
    } catch (error) {
      if (error.code === "CANNOT_MARK_PAST_LEAVE") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "LEAVE_ALREADY_EXISTS") {
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
   * POST /api/doctors/:id/leaves/bulk — Mark bulk leave
   */
  async markBulkLeave(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;
      const { fromDate, toDate, reason } = req.body;

      // Validate
      const validation = validateBulkLeave({ fromDate, toDate, reason });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Mark bulk leave
      const result = await doctorService.markBulkLeave(
        hospitalId,
        id,
        fromDate,
        toDate,
        reason
      );

      const response = {
        success: true,
        data: result.leaves,
        createdCount: result.createdCount,
      };

      if (result.warning) {
        response.warning = result.warning;
      }

      res.status(201).json(response);
    } catch (error) {
      if (error.code === "BULK_LEAVE_LIMIT_EXCEEDED") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "INVALID_DATE_RANGE") {
        return res.status(422).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * DELETE /api/doctors/:id/leaves/:leaveId — Cancel leave
   */
  async cancelLeave(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id, leaveId } = req.params;

      const result = await doctorService.cancelLeave(hospitalId, id, leaveId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error.code === "LEAVE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "CANNOT_CANCEL_PAST_LEAVE") {
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
   * GET /api/doctors/:id/leaves — Get doctor leaves
   */
  async getLeaves(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id } = req.params;
      const { from, to } = req.query;

      const leaves = await doctorService.getLeaves(hospitalId, id, from, to);

      res.json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DoctorController();
