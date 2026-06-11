// Token Routes
const express = require("express");
const router = express.Router();

const controller = require("./token.controller");
const authenticate = require("../../../middleware/auth.middleware");

// Middleware to check roles
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "User role not found",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Public display board — no auth required
/**
 * GET /api/opd/queue/display — Token display board
 * No auth required (for waiting room displays)
 * Query params: hospitalId (required), doctorId (optional)
 */
router.get("/display", controller.getDisplayBoard);

// Protected routes — JWT required
router.use(authenticate);

/**
 * GET /api/opd/queue — Full queue for a doctor
 * Auth: JWT required
 * Roles: All authenticated
 * Query params: doctorId (required), date (optional)
 */
router.get(
  "/",
  checkRole(["DOCTOR", "RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.getQueue
);

/**
 * POST /api/opd/tokens/:tokenId/call — Call next patient
 * Auth: JWT required
 * Roles: DOCTOR, RECEPTIONIST, NURSE
 * Query params: doctorId (required)
 */
router.post(
  "/:tokenId/call",
  checkRole(["DOCTOR", "RECEPTIONIST", "NURSE"]),
  controller.callToken
);

/**
 * POST /api/opd/tokens/:tokenId/start — Start consultation
 * Auth: JWT required
 * Roles: DOCTOR
 * Query params: doctorId (required)
 */
router.post(
  "/:tokenId/start",
  checkRole(["DOCTOR"]),
  controller.startConsultation
);

/**
 * POST /api/opd/tokens/:tokenId/complete — End consultation
 * Auth: JWT required
 * Roles: DOCTOR
 * Query params: doctorId (required)
 */
router.post(
  "/:tokenId/complete",
  checkRole(["DOCTOR"]),
  controller.completeConsultation
);

/**
 * POST /api/opd/tokens/:tokenId/skip — Skip patient
 * Auth: JWT required
 * Roles: RECEPTIONIST, DOCTOR, NURSE
 */
router.post(
  "/:tokenId/skip",
  checkRole(["RECEPTIONIST", "DOCTOR", "NURSE"]),
  controller.skipToken
);

/**
 * POST /api/opd/tokens/:tokenId/requeue — Requeue skipped token
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE
 * Query params: doctorId (required)
 */
router.post(
  "/:tokenId/requeue",
  checkRole(["RECEPTIONIST", "NURSE"]),
  controller.requeueToken
);

module.exports = router;
