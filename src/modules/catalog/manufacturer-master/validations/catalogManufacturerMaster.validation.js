import Joi from "joi";

/**
 * Validation schemas for Catalog ManufacturerMaster module (read-only).
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

export const getCatalogManufacturerMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---------------------
// Param schemas
// ---------------------

export const catalogManufacturerMasterIdParamSchema = Joi.object({
  manufacturerId: objectId.required(),
});

export const catalogManufacturerMasterNameParamSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Manufacturer name cannot be empty",
    "any.required": "Manufacturer name is required",
  }),
});
