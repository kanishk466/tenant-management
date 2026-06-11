// OPD Module Router
const express = require("express");
const router = express.Router();

const authenticate = require("../../middleware/auth.middleware");
const dashboardService = require("./opd.dashboard");

// Mount visit routes
router.use("/visits", require("./visit/visit.routes"));

// Mount token routes
router.use("/tokens", require("./token/token.routes"));

// Mount appointment routes
router.use("/appointments", require("./appointment/appointment.routes"));

/**
 * GET /api/opd/dashboard — OPD Dashboard (all data)
 * Auth: JWT required
 * Roles: All authenticated users
 */
router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const { hospitalId, sub: userId, role } = req.user;

    const dashboard = await dashboardService.getDashboard(hospitalId, userId, role);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
