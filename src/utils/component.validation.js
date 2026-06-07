const { z } = require("zod");

const createComponentSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),

  type: z.enum([
    "MODULE",
    "SUB_MODULE",
    "FEATURE"
  ]),

  parentId: z.string().uuid().nullable().optional(),

  displayOrder: z.number().optional()
});

const updateComponentSchema =
  createComponentSchema.partial();

module.exports = {
  createComponentSchema,
  updateComponentSchema
};