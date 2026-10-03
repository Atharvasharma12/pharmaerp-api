import Joi from "joi";

import { PLATFORM_PRICING_STATUS } from "../constants/platformPricing.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid id" });

export const setPricingSchema = Joi.object({
  // Platform admin sets price for a global product — applies to ALL stores
  globalProductId: objectId.required().messages({
    "any.required": "Global product ID is required",
  }),

  mrp: Joi.number().min(0).required().messages({
    "any.required": "MRP is required",
    "number.min": "MRP must be >= 0",
  }),

  customerPrice: Joi.number().min(0).required().messages({
    "any.required": "Customer price is required",
    "number.min": "Customer price must be >= 0",
  }),

  partnerSettlementPrice: Joi.number().min(0).required().messages({
    "any.required": "Partner settlement price is required",
    "number.min": "Partner settlement price must be >= 0",
  }),

  deliveryCharge: Joi.number().min(0).default(0),

  status: Joi.string()
    .valid(...Object.values(PLATFORM_PRICING_STATUS))
    .optional(),
});

export const updatePricingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PLATFORM_PRICING_STATUS))
    .required(),
});

export const pricingIdParamSchema = Joi.object({
  pricingId: objectId.required(),
});

export const globalProductIdParamSchema = Joi.object({
  globalProductId: objectId.required(),
});

export const getAllPricingQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PLATFORM_PRICING_STATUS))
    .optional(),
});
