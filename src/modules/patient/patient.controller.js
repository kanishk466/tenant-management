// Patient Controller
const patientService = require("./patient.service");
const {
  validateCreatePatient,
  validateUpdatePatient,
  validateCheckDuplicate,
} = require("./patient.validation");

class PatientController {
  /**
   * POST /api/patients — Create new patient
   */
  async create(req, res, next) {
    try {
      const { hospitalId, sub: userId } = req.user;
      const patientData = req.body;

      // Validate
      const validation = validateCreatePatient(patientData);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Create patient
      const patient = await patientService.createPatient(
        hospitalId,
        userId,
        patientData
      );

      res.status(201).json({
        success: true,
        message: "Patient created successfully",
        data: patient,
      });
    } catch (error) {
      if (error.code === "PATIENT_DUPLICATE_PHONE") {
        return res.status(409).json({
          success: false,
          message: "Patient with this phone already exists",
          code: error.code,
          existingPatient: error.existingPatient,
        });
      }

      if (error.code === "UHID_GENERATION_FAILED") {
        return res.status(500).json({
          success: false,
          message: "Failed to generate UHID",
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/patients — Search patients with filters
   */
  async search(req, res, next) {
    try {
      const { hospitalId } = req.user;

      const filters = {
        q: req.query.q || null,
        phone: req.query.phone || null,
        uhid: req.query.uhid || null,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
      };

      // Validate limit
      if (filters.limit > 50) {
        filters.limit = 50;
      }

      const result = await patientService.searchPatients(hospitalId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/patients/:id — Get patient details with recent visits
   */
  async getDetail(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: patientId } = req.params;

      const result = await patientService.getPatientDetail(
        hospitalId,
        patientId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.code === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * PATCH /api/patients/:id — Update patient
   */
  async update(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: patientId } = req.params;
      const updateData = req.body;

      // Validate
      const validation = validateUpdatePatient(updateData);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await patientService.updatePatient(
        hospitalId,
        patientId,
        updateData
      );

      res.json({
        success: true,
        message: "Patient updated successfully",
        data: updated,
      });
    } catch (error) {
      if (error.code === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * DELETE /api/patients/:id — Soft delete patient
   */
  async delete(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: patientId } = req.params;

      const deleted = await patientService.deletePatient(hospitalId, patientId);

      res.json({
        success: true,
        message: "Patient deleted successfully",
        data: deleted,
      });
    } catch (error) {
      if (error.code === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
          code: error.code,
        });
      }

      if (error.code === "PATIENT_HAS_ACTIVE_VISITS") {
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
   * POST /api/patients/check-duplicate — Check for duplicate patients before creation
   */
  async checkDuplicate(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { phone, firstName } = req.body;

      // Validate
      const validation = validateCheckDuplicate({ phone });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const duplicates = await patientService.checkDuplicate(
        hospitalId,
        phone,
        firstName
      );

      res.json({
        success: true,
        data: {
          hasDuplicates: duplicates.length > 0,
          possibleDuplicates: duplicates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/patients/:id/timeline — Get patient timeline
   */
  async getTimeline(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { id: patientId } = req.params;

      const timeline = await patientService.getPatientTimeline(
        hospitalId,
        patientId
      );

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      if (error.code === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
          code: error.code,
        });
      }

      next(error);
    }
  }
}

module.exports = new PatientController();
