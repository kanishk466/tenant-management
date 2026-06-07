const express = require("express");

const router = express.Router();

router.use(
  "/auth",
  require("../modules/auth/auth.routes")
);

module.exports = router;