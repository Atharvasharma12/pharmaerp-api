import Joi from "joi";

/**
 * Validation schemas for BankMaster module.
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

export const createBankMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Bank name cannot be empty",
    "any.required": "Bank name is required",
  }),

  logoUrl: Joi.string().trim().allow(null, "").optional(),

  website: Joi.string().trim().allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
});

// ---------------------
// Update schema
// ---------------------

export const updateBankMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  logoUrl: Joi.string().trim().allow(null, "").optional(),

  website: Joi.string().trim().allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const bankMasterIdParamSchema = Joi.object({
  bankId: objectId.required(),
});

// ---------------------
// Query / list schema
// ---------------------

export const getBankMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
