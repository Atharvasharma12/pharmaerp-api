import Joi from "joi";

import { GST_RATE_VALUES } from "../../../platform/global-catalog/hsn-master/constants/gstRates.constant.js";

/**
 * Validation schemas for Catalog HsnMaster module (read-only).
 *
 * Only query and param schemas are needed — no body schemas since
 * create / update / delete are not exposed in the catalog layer.
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

export const getCatalogHsnMastersQuerySchema = Joi.object({
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

// ---------------------
// Param schemas
// ---------------------

export const catalogHsnMasterIdParamSchema = Joi.object({
  hsnId: objectId.required(),
});

export const catalogHsnMasterCodeParamSchema = Joi.object({
  hsnCode: Joi.number().integer().min(0).required().messages({
    "number.base": "HSN code must be a number",
    "number.integer": "HSN code must be an integer",
    "number.min": "HSN code must be a non-negative number",
    "any.required": "HSN code is required",
  }),
});
