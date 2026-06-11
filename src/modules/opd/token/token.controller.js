// Token Controller — Queue management
const tokenService = require("./token.service");
const {
  validateCallToken,
  validateStartConsultation,
  validateCompleteConsultation,
  validateSkipToken,
  validateRequeueToken,
} = require("./token.validation");

class TokenController {
  /**
   * GET /api/opd/queue — Full queue for a doctor
   */
  async getQueue(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { doctorId, date } = req.query;

      if (!doctorId) {
        return res.status(422).json({
          success: false,
          message: "doctorId is required",
        });
      }

      const queue = await tokenService.getQueueForDoctor(
        hospitalId,
        doctorId,
        date
      );

      res.json({
        success: true,
        data: queue,
      });
    } catch (error) {
      if (error.code === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Doctor not found or inactive",
          code: error.code,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/opd/tokens/:tokenId/call — Call next patient
   */
  async callToken(req, res, next) {
    try {
      const { hospitalId, sub: userId } = req.user;
      const { tokenId } = req.params;

      // Get doctorId from query — doctor calling their own token
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(422).json({
          success: false,
          message: "doctorId is required in query params",
        });
      }

      // Validate
      const validation = validateCallToken(req.body);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await tokenService.callToken(
        hospitalId,
        tokenId,
        doctorId
      );

      res.json({
        success: true,
        message: "Patient called successfully",
        data: updated,
      });
    } catch (error) {
      if (error.code === "TOKEN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Token not found",
          code: error.code,
        });
      }

      if (error.code === "ANOTHER_TOKEN_IN_CONSULTATION") {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }

      if (error.code === "INVALID_TOKEN_STATUS") {
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
   * POST /api/opd/tokens/:tokenId/start — Start consultation
   */
  async startConsultation(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { tokenId } = req.params;
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(422).json({
          success: false,
          message: "doctorId is required in query params",
        });
      }

      // Validate
      const validation = validateStartConsultation(req.body);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await tokenService.startConsultation(
        hospitalId,
        tokenId,
        doctorId
      );

      res.json({
        success: true,
        message: "Consultation started",
        data: updated,
      });
    } catch (error) {
      if (error.code === "TOKEN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Token not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_TOKEN_STATUS") {
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
   * POST /api/opd/tokens/:tokenId/complete — End consultation
   */
  async completeConsultation(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { tokenId } = req.params;
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(422).json({
          success: false,
          message: "doctorId is required in query params",
        });
      }

      // Validate
      const validation = validateCompleteConsultation(req.body);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await tokenService.completeConsultation(
        hospitalId,
        tokenId,
        doctorId
      );

      res.json({
        success: true,
        message: "Consultation completed",
        data: updated,
      });
    } catch (error) {
      if (error.code === "TOKEN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Token not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_TOKEN_STATUS") {
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
   * POST /api/opd/tokens/:tokenId/skip — Skip patient
   */
  async skipToken(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { tokenId } = req.params;
      const { skipReason } = req.body;

      // Validate
      const validation = validateSkipToken({ skipReason });
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await tokenService.skipToken(
        hospitalId,
        tokenId,
        skipReason
      );

      res.json({
        success: true,
        message: "Token skipped",
        data: updated,
      });
    } catch (error) {
      if (error.code === "TOKEN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Token not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_TOKEN_STATUS") {
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
   * POST /api/opd/tokens/:tokenId/requeue — Requeue skipped token
   */
  async requeueToken(req, res, next) {
    try {
      const { hospitalId } = req.user;
      const { tokenId } = req.params;
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(422).json({
          success: false,
          message: "doctorId is required in query params",
        });
      }

      // Validate
      const validation = validateRequeueToken(req.body);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const updated = await tokenService.requeueToken(
        hospitalId,
        tokenId,
        doctorId
      );

      res.json({
        success: true,
        message: "Token requeued",
        data: updated,
      });
    } catch (error) {
      if (error.code === "TOKEN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Token not found",
          code: error.code,
        });
      }

      if (error.code === "INVALID_TOKEN_STATUS") {
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
   * GET /api/opd/queue/display — Token display board (public)
   */
  async getDisplayBoard(req, res, next) {
    try {
      const { hospitalId } = req.query;
      const { doctorId } = req.query;

      if (!hospitalId) {
        return res.status(422).json({
          success: false,
          message: "hospitalId is required",
        });
      }

      const displayBoard = await tokenService.getDisplayBoard(
        parseInt(hospitalId, 10),
        doctorId || null
      );

      res.json({
        success: true,
        data: displayBoard,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TokenController();
