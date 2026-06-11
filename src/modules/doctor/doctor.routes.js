// Doctor Routes — API endpoints + Role-based access control

const express = require("express");
const router = express.Router();

const authenticate = require("../../middleware/auth.middleware");
const controller = require("./doctor.controller");

/**
 * Role check middleware
 */
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

/**
 * Own resource check middleware — for doctor to access own data
 */
const checkOwnResource = (req, res, next) => {
  const { hospitalId, role, sub: userId } = req.user;
  const { id } = req.params;

  // Admin can access any doctor
  if (role === "HOSPITAL_ADMIN") {
    return next();
  }

  // Doctor can only access own profile
  if (role === "DOCTOR") {
    // Need to verify userId matches doctorId (requires db lookup, done in controller)
    // For now, allow doctor to proceed; controller will verify
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Insufficient permissions",
  });
};

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/doctors — Create new doctor
 * Who: HOSPITAL_ADMIN only
 */
router.post("/", checkRole(["HOSPITAL_ADMIN"]), controller.createDoctor);

/**
 * GET /api/doctors — List all doctors
 * Who: All authenticated users
 * Query: isActive (default: true), specialization, department, q
 */
router.get("/", controller.listDoctors);

/**
 * GET /api/doctors/:id — Get doctor detail
 * Who: HOSPITAL_ADMIN, RECEPTIONIST, NURSE, Doctor (own only)
 */
router.get("/:id", checkRole(["HOSPITAL_ADMIN", "RECEPTIONIST", "NURSE", "DOCTOR"]), controller.getDoctorDetail);

/**
 * PATCH /api/doctors/:id — Update doctor profile
 * Who: HOSPITAL_ADMIN, Doctor (own only)
 */
router.patch("/:id", checkRole(["HOSPITAL_ADMIN", "DOCTOR"]), checkOwnResource, controller.updateDoctor);

/**
 * PUT /api/doctors/:id/schedule — Set doctor schedule
 * Who: HOSPITAL_ADMIN, Doctor (own only)
 */
router.put("/:id/schedule", checkRole(["HOSPITAL_ADMIN", "DOCTOR"]), checkOwnResource, controller.setSchedule);

/**
 * GET /api/doctors/:id/schedule — Get doctor schedule
 * Who: All authenticated users
 */
router.get("/:id/schedule", checkRole(["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"]), controller.getSchedule);

/**
 * POST /api/doctors/:id/leaves — Mark single leave
 * Who: HOSPITAL_ADMIN, Doctor (own only)
 */
router.post("/:id/leaves", checkRole(["HOSPITAL_ADMIN", "DOCTOR"]), checkOwnResource, controller.markLeave);

/**
 * POST /api/doctors/:id/leaves/bulk — Mark bulk leave
 * Who: HOSPITAL_ADMIN only
 */
router.post("/:id/leaves/bulk", checkRole(["HOSPITAL_ADMIN"]), controller.markBulkLeave);

/**
 * DELETE /api/doctors/:id/leaves/:leaveId — Cancel leave
 * Who: HOSPITAL_ADMIN, Doctor (own only)
 */
router.delete("/:id/leaves/:leaveId", checkRole(["HOSPITAL_ADMIN", "DOCTOR"]), checkOwnResource, controller.cancelLeave);

/**
 * GET /api/doctors/:id/leaves — Get doctor leaves
 * Who: All authenticated users
 * Query: from, to (optional, default 30 days from now)
 */
router.get("/:id/leaves", checkRole(["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"]), controller.getLeaves);

module.exports = router;
