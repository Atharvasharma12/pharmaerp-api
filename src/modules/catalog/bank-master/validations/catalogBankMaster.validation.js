import Joi from "joi";

/**
 * Validation schemas for Catalog BankMaster module (read-only).
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
// Query / list schema
// ---------------------

export const getCatalogBankMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---------------------
// Param schemas
// ---------------------

export const catalogBankMasterIdParamSchema = Joi.object({
  bankId: objectId.required(),
});

export const catalogBankMasterNameParamSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Bank name cannot be empty",
    "any.required": "Bank name is required",
  }),
});
