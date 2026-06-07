// TODO: Implement
const crypto = require("crypto");

function generateHospitalCode() {
  return `HSP-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

module.exports = generateHospitalCode;