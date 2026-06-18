import Joi from "joi";

/**
 * Validation schemas for ProductFormMaster module.
 */

// ---------------------
// Reusable helpers
// ---------------------

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

// ---------------------
// Create schema
// ---------------------

export const createProductFormMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Product Form name cannot be empty",
    "any.required": "Product Form name is required",
  }),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
});

// ---------------------
// Update schema
// ---------------------

export const updateProductFormMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const productFormMasterIdParamSchema = Joi.object({
  formId: objectId.required(),
});

// ---------------------
// Query / list schema
// ---------------------

export const getProductFormMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
