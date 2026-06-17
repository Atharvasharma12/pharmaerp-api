import Joi from "joi";

import { GST_RATE_VALUES } from "../constants/gstRates.constant.js";

/**
 * Validation schemas for HsnMaster module.
 *
 * Architecture rules enforced:
 * ──────────────────────────────────────────
 * ✅ code is required on create and immutable (excluded from update schema).
 * ✅ gstRate must be one of the allowed GST slab values: 0, 5, 12, 18, 28.
 * ✅ description is optional and capped at 2000 characters.
 * ❌ Pricing, product, and inventory fields are FORBIDDEN here.
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

export const createHsnMasterSchema = Joi.object({
  // code is the HSN / SAC number (numeric) — required and immutable
  code: Joi.number().integer().min(0).required().messages({
    "number.base": "HSN code must be a number",
    "number.integer": "HSN code must be an integer",
    "number.min": "HSN code must be a non-negative number",
    "any.required": "HSN code is required",
  }),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  gstRate: Joi.number()
    .valid(...GST_RATE_VALUES)
    .allow(null)
    .optional()
    .messages({
      "any.only": `GST rate must be one of: ${GST_RATE_VALUES.join(", ")}`,
    }),

  isActive: Joi.boolean().optional(),
});

// ---------------------
// Update schema
// ---------------------

/**
 * code is intentionally excluded — it is immutable after creation.
 */
export const updateHsnMasterSchema = Joi.object({
  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  gstRate: Joi.number()
    .valid(...GST_RATE_VALUES)
    .allow(null)
    .optional()
    .messages({
      "any.only": `GST rate must be one of: ${GST_RATE_VALUES.join(", ")}`,
    }),

  isActive: Joi.boolean().optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const hsnMasterIdParamSchema = Joi.object({
  hsnId: objectId.required(),
});

export const hsnMasterCodeParamSchema = Joi.object({
  hsnCode: Joi.number().integer().min(0).required().messages({
    "number.base": "HSN code must be a number",
    "number.integer": "HSN code must be an integer",
    "number.min": "HSN code must be a non-negative number",
    "any.required": "HSN code is required",
  }),
});

// ---------------------
// Query / list schema
// ---------------------

export const getHsnMastersQuerySchema = Joi.object({
  isActive: Joi.boolean().optional(),

  gstRate: Joi.number()
    .valid(...GST_RATE_VALUES)
    .optional()
    .messages({
      "any.only": `GST rate must be one of: ${GST_RATE_VALUES.join(", ")}`,
    }),

  // Full-text search across description
  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
