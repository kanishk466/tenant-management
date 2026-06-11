// Patient Routes
const express = require("express");
const router = express.Router();

const controller = require("./patient.controller");
const authenticate = require("../../middleware/auth.middleware");

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
 * POST /api/patients — Create patient
 * Auth: JWT required
 * Roles: RECEPTIONIST, HOSPITAL_ADMIN
 */
router.post(
  "/",
  checkRole(["RECEPTIONIST", "HOSPITAL_ADMIN"]),
  controller.create
);

/**
 * GET /api/patients — Search patients
 * Auth: JWT required
 * Roles: All authenticated users
 */
router.get("/", controller.search);

/**
 * POST /api/patients/check-duplicate — Check for duplicate patients
 * Auth: JWT required
 * Roles: RECEPTIONIST, HOSPITAL_ADMIN
 */
router.post(
  "/check-duplicate",
  checkRole(["RECEPTIONIST", "HOSPITAL_ADMIN"]),
  controller.checkDuplicate
);

/**
 * GET /api/patients/:id — Get patient details
 * Auth: JWT required
 * Roles: All authenticated users
 */
router.get("/:id", controller.getDetail);

/**
 * GET /api/patients/:id/timeline — Get patient timeline
 * Auth: JWT required
 * Roles: DOCTOR, HOSPITAL_ADMIN
 */
router.get(
  "/:id/timeline",
  checkRole(["DOCTOR", "HOSPITAL_ADMIN"]),
  controller.getTimeline
);

/**
 * PATCH /api/patients/:id — Update patient
 * Auth: JWT required
 * Roles: RECEPTIONIST, HOSPITAL_ADMIN
 */
router.patch(
  "/:id",
  checkRole(["RECEPTIONIST", "HOSPITAL_ADMIN"]),
  controller.update
);

/**
 * DELETE /api/patients/:id — Soft delete patient
 * Auth: JWT required
 * Roles: HOSPITAL_ADMIN only
 */
router.delete(
  "/:id",
  checkRole(["HOSPITAL_ADMIN"]),
  controller.delete
);

module.exports = router;
