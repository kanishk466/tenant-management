const express = require("express");

const router = express.Router();

router.use(
  "/auth",
  require("../modules/auth/auth.routes")
);

router.use(
  "/hospitals",
  require("../modules/hospitals/hospital.routes")
);


router.use(
  "/components",
  require("../modules/components/component.routes")
);


router.use(
  "/packages",
  require("../modules/packages/package.routes")
);

module.exports = router;