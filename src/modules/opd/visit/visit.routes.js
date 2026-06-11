// Visit Routes
const express = require("express");
const router = express.Router();

const controller = require("./visit.controller");
const vitalsController = require("./vitals.controller");
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

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/opd/visits — Register patient for OPD
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE
 */
router.post(
  "/",
  checkRole(["RECEPTIONIST", "NURSE"]),
  controller.create
);

/**
 * GET /api/opd/visits — List visits
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE, DOCTOR, HOSPITAL_ADMIN
 */
router.get(
  "/",
  checkRole(["RECEPTIONIST", "NURSE", "DOCTOR", "HOSPITAL_ADMIN"]),
  controller.list
);

/**
 * GET /api/opd/visits/:id — Get visit detail
 * Auth: JWT required
 * Roles: DOCTOR, RECEPTIONIST, NURSE, HOSPITAL_ADMIN
 */
router.get(
  "/:id",
  checkRole(["DOCTOR", "RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.getDetail
);

/**
 * PATCH /api/opd/visits/:id/status — Update visit status
 * Auth: JWT required
 * Roles: DOCTOR, NURSE (typically called by token API internally)
 */
router.patch(
  "/:id/status",
  checkRole(["DOCTOR", "NURSE", "HOSPITAL_ADMIN"]),
  controller.updateStatus
);

/**
 * PATCH /api/opd/visits/:id/cancel — Cancel visit
 * Auth: JWT required
 * Roles: RECEPTIONIST, HOSPITAL_ADMIN
 */
router.patch(
  "/:id/cancel",
  checkRole(["RECEPTIONIST", "HOSPITAL_ADMIN"]),
  controller.cancel
);

/**
 * POST /api/opd/visits/:visitId/vitals — Record vitals
 * Auth: JWT required
 * Roles: NURSE
 */
router.post(
  "/:visitId/vitals",
  checkRole(["NURSE", "HOSPITAL_ADMIN"]),
  vitalsController.recordVitals
);

/**
 * GET /api/opd/visits/:visitId/vitals — Get vitals with history
 * Auth: JWT required
 * Roles: DOCTOR, NURSE, HOSPITAL_ADMIN
 */
router.get(
  "/:visitId/vitals",
  checkRole(["DOCTOR", "NURSE", "HOSPITAL_ADMIN"]),
  vitalsController.getVitalsWithHistory
);

module.exports = router;
