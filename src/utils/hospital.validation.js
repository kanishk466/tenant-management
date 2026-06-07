const { z } = require("zod");

const createHospitalSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  phone: z.string().optional(),
});

const updateHospitalSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
});

module.exports = {
  createHospitalSchema,
  updateHospitalSchema,
};