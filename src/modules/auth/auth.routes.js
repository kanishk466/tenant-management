const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");

const authenticate = require("../../middleware/auth.middleware");

router.post("/login", authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get(
  "/me",
  authenticate,
  authController.me
);

module.exports = router;