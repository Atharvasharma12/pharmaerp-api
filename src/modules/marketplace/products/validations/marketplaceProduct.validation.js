import Joi from "joi";

import {
  MARKETPLACE_PRODUCT_STATUS,
  MARKETPLACE_PRODUCT_VISIBILITY,
  MARKETPLACE_PRODUCT_PRESCRIPTION,
} from "../constants/marketplaceProduct.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid id" });

export const enableProductSchema = Joi.object({
  globalProductId: objectId.required().messages({
    "any.required": "Global product ID is required",
  }),

  visibility: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_VISIBILITY))
    .default(MARKETPLACE_PRODUCT_VISIBILITY.VISIBLE),

  prescriptionRequired: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_PRESCRIPTION))
    .default(MARKETPLACE_PRODUCT_PRESCRIPTION.NOT_REQUIRED),

  isFeatured: Joi.boolean().default(false),

  sortOrder: Joi.number().integer().min(0).default(0),
});

export const updateProductSchema = Joi.object({
  visibility: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_VISIBILITY))
    .optional(),

  prescriptionRequired: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_PRESCRIPTION))
    .optional(),

  isFeatured: Joi.boolean().optional(),

  sortOrder: Joi.number().integer().min(0).optional(),

  status: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_STATUS))
    .optional(),
});

export const productIdParamSchema = Joi.object({
  productId: objectId.required(),
});

export const listProductsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_STATUS))
    .optional(),

  visibility: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_VISIBILITY))
    .optional(),

  isFeatured: Joi.boolean().optional(),

  prescriptionRequired: Joi.string()
    .valid(...Object.values(MARKETPLACE_PRODUCT_PRESCRIPTION))
    .optional(),
});
