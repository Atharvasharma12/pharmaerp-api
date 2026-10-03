import Joi from "joi";

/**
 * Validation schemas for CategoryMaster module.
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

export const createCategoryMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Category name cannot be empty",
    "any.required": "Category name is required",
  }),

  parentCategory: objectId.allow(null, "").optional(),

  description: Joi.string().trim().max(1000).allow(null, "").optional(),

  // Accept any string for images since it might be relative uploads path or standard URI
  imageUrl: Joi.string().trim().max(1000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
});

// ---------------------
// Update schema
// ---------------------

export const updateCategoryMasterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  parentCategory: objectId.allow(null, "").optional(),

  description: Joi.string().trim().max(1000).allow(null, "").optional(),

  imageUrl: Joi.string().trim().max(1000).allow(null, "").optional(),

  isActive: Joi.boolean().optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const categoryMasterIdParamSchema = Joi.object({
  categoryId: objectId.required(),
});

export const categoryMasterSlugParamSchema = Joi.object({
  slug: Joi.string().trim().min(1).max(255).required(),
});

// ---------------------
// Query / list schema
// ---------------------

export const getCategoryMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  // Can be "null" string or an ObjectId
  parentCategory: Joi.string().trim().allow(null, "null", "").optional(),

  level: Joi.number().integer().min(0).optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
