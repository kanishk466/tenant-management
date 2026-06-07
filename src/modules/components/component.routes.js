const express = require("express");

const router = express.Router();

const authenticate =
  require("../../middleware/auth.middleware");

const controller =
  require("./component.controller");

router.use(authenticate);

router.post("/", controller.create);

router.get("/", controller.getAll);

router.get("/tree", controller.getTree);

router.get("/:id", controller.getById);

router.patch("/:id", controller.update);

module.exports = router;
