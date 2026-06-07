const { z } = require("zod");

const createPackageSchema = z.object({
  name: z.string().min(2),

  description: z.string().optional(),

  monthlyPrice: z.number().nonnegative(),

  yearlyPrice: z.number().nonnegative()
});

const updatePackageSchema =
  createPackageSchema.partial();

module.exports = {
  createPackageSchema,
  updatePackageSchema
};