import Joi from "joi";

/**
 * Validation schemas for Catalog CategoryMaster module (read-only).
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

export const getCatalogCategoryMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  parentCategory: Joi.string().trim().allow(null, "null", "").optional(),

  level: Joi.number().integer().min(0).optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---------------------
// Param schemas
// ---------------------

export const catalogCategoryMasterIdParamSchema = Joi.object({
  categoryId: objectId.required(),
});

export const catalogCategoryMasterSlugParamSchema = Joi.object({
  slug: Joi.string().trim().min(1).max(255).required(),
});
