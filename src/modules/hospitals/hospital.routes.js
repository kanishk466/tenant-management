// TODO: Implement
const express = require("express");

const router = express.Router();

const controller =
  require("./hospital.controller");

const authenticate =
  require("../../middleware/auth.middleware");

router.use(authenticate);

router.post("/", controller.create);

router.get("/", controller.getAll);

router.get("/:id", controller.getById);

router.patch("/:id", controller.update);

router.patch(
  "/:id/status",
  controller.changeStatus
);

router.post(
  "/:hospitalId/assign-package",
  controller.assignPackage
);

router.get(
  "/:hospitalId/package",
  controller.getAssignedPackage
);

module.exports = router;