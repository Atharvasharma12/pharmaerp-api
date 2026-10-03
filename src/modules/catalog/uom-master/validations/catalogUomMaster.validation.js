import Joi from "joi";

/**
 * Validation schemas for Catalog UomMaster module (read-only).
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

export const getCatalogUomMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---------------------
// Param schemas
// ---------------------

export const catalogUomMasterIdParamSchema = Joi.object({
  uomId: objectId.required(),
});
