const express = require("express");

const router = express.Router();

const authenticate =
  require("../../middleware/auth.middleware");

const controller =
  require("./package.controller");

router.use(authenticate);

router.post("/", controller.create);

router.get("/", controller.getAll);

router.get("/:id", controller.getById);

router.patch("/:id", controller.update);


router.post(
  "/:id/components",
  controller.assignComponents
);

router.get(
  "/:id/components",
  controller.getComponents
);

router.patch(
  "/:id/status",
  controller.changeStatus
);


router.post('/:id/limits', controller.assignLimits);
router.get('/:id/limits', controller.getLimits);

module.exports = router;