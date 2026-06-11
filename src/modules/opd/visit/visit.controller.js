// Visit Controller
const visitService = require("./visit.service");
const prisma = require("../../../config/prisma");
const {
  validateCreateVisit,
  validateUpdateVisitStatus,
  validateCancelVisit,
} = require("./visit.validation");

class VisitController {
  /**
   * POST /api/opd/visits — Register patient for OPD
   */
  async create(req, res, next) {
    try {
      const { hospitalId, sub: userId } = req.user;
      const visitData = req.body;

      // Validate
      const validation = validateCreateVisit(visitData);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Create visit + token
      const result = await visitService.createVisit(hospitalId, userId, visitData);

      // Fetch full patient data for response
      const patient = await prisma.patient.findUnique({
        where: { id: visitData.patientId },
        select: {
          uhid: true,
          firstName: true,
          lastName: true,
          age: true,
          gender: true,
          knownAllergies: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Visit registered successfully",
        data: {
          visit: result.visit,
          token: result.token,
          patient,
        },
      });
    } catch (error) {
      if (error.code === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
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

      if (error.code === "VISIT_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
          existingVisit: error.existingVisit,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/opd/visits — List visits with filters
   */
  async list(req, res, next) {
    try {
      const { hospitalId } = req.user;

      const filters = {
        date: req.query.date || null,
        doctorId: req.query.doctorId || null,
        status: req.query.status || null,
        patientId: req.query.patientId || null,
        visitType: req.query.visitType || null,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 50,
      };

      // Validate limit
      if (filters.limit > 100) {
        filters.limit = 100;
      }

      const result = await visitService.getVisits(hospitalId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/opd/visits/:id — Get visit detail
   */
  async getDetail(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: visitId } = req.params;

      const visit = await visitService.getVisitDetail(hospitalId, visitId);

      res.json({
        success: true,
        data: visit,
      });
    } catch (error) {
      if (error.code === "VISIT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PATCH /api/opd/visits/:id/status — Update visit status (internal)
   */
  async updateStatus(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: visitId } = req.params;
      const { status: newStatus } = req.body;

      // Validate
      const validation = validateUpdateVisitStatus({ status: newStatus });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await visitService.updateVisitStatus(hospitalId, visitId, newStatus);

      res.json({
        success: true,
        message: "Visit status updated successfully",
        data: updated,
      });
    } catch (error) {
      if (error.code === "VISIT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_STATUS_TRANSITION") {
        return res.status(422).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "COMPLETED_VISIT_IMMUTABLE") {
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
   * PATCH /api/opd/visits/:id/cancel — Cancel visit
   */
  async cancel(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: visitId } = req.params;
      const { cancellationReason } = req.body;

      // Validate
      const validation = validateCancelVisit({ cancellationReason });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const cancelled = await visitService.cancelVisit(hospitalId, visitId, cancellationReason);

      res.json({
        success: true,
        message: "Visit cancelled successfully",
        data: cancelled,
      });
    } catch (error) {
      if (error.code === "VISIT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
          code: error.code,
        });
      }

      if (error.code === "VISIT_CANCELLATION_NOT_ALLOWED") {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }
}

module.exports = new VisitController();
