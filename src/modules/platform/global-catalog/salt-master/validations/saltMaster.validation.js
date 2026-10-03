import Joi from "joi";

/**
 * Validation schemas for SaltMaster module.
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

export const createSaltMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Salt name cannot be empty",
    "any.required": "Salt name is required",
  }),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
});

// ---------------------
// Update schema
// ---------------------

export const updateSaltMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const saltMasterIdParamSchema = Joi.object({
  saltId: objectId.required(),
});

export const saltMasterNameParamSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Salt name cannot be empty",
    "any.required": "Salt name is required",
  }),
});

// ---------------------
// Query / list schema
// ---------------------

export const getSaltMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
