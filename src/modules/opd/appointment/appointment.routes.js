// Appointment Routes
const express = require("express");
const router = express.Router();

const controller = require("./appointment.controller");
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
 * GET /api/opd/doctors/:doctorId/slots — Get available slots
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE, HOSPITAL_ADMIN
 * Query params: date (required)
 */
router.get(
  "/doctors/:doctorId/slots",
  checkRole(["RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.getSlots
);

/**
 * POST /api/opd/appointments — Book appointment
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE, HOSPITAL_ADMIN, PATIENT (future)
 */
router.post(
  "/",
  checkRole(["RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.book
);

/**
 * PATCH /api/opd/appointments/:id/arrive — Patient arrived
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE, HOSPITAL_ADMIN
 */
router.patch(
  "/:id/arrive",
  checkRole(["RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.arrive
);

/**
 * PATCH /api/opd/appointments/:id/status — Update appointment status
 * Auth: JWT required
 * Roles: RECEPTIONIST, NURSE, HOSPITAL_ADMIN
 * Body: status (CONFIRMED | CANCELLED | NO_SHOW), cancellationReason (optional)
 */
router.patch(
  "/:id/status",
  checkRole(["RECEPTIONIST", "NURSE", "HOSPITAL_ADMIN"]),
  controller.updateStatus
);

module.exports = router;
