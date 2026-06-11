// Vitals Controller — Phase 3A

const vitalsService = require("./vitals.service");
const { validateRecordVitals } = require("./vitals.validation");

class VitalsController {
  /**
   * POST /api/opd/visits/:visitId/vitals — Record vitals
   */
  async recordVitals(req, res, next) {
    try {
      const { hospitalId, sub: userId } = req.user;
      const { visitId } = req.params;
      const data = req.body;

      // Validate
      const validation = validateRecordVitals(data);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Record vitals
      const result = await vitalsService.recordVitals(
        hospitalId,
        visitId,
        data,
        userId
      );

      res.status(201).json({
        success: true,
        message: "Vitals recorded successfully",
        data: result,
      });
    } catch (error) {
      if (error.code === "VISIT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "VITALS_NOT_ALLOWED") {
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
   * GET /api/opd/visits/:visitId/vitals — Get vitals with history
   */
  async getVitalsWithHistory(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { visitId } = req.params;

      const result = await vitalsService.getVitalsWithHistory(
        hospitalId,
        visitId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error.code === "VITALS_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      next(error);
    }
  }
}

module.exports = new VitalsController();
