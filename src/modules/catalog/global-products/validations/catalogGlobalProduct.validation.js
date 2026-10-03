import Joi from "joi";

import {
  GLOBAL_PRODUCT_STATUS,
  GLOBAL_PRODUCT_TYPE,
  GLOBAL_PRODUCT_DATA_SOURCE,
} from "../../../platform/global-catalog/products/constants/globalProduct.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const getCatalogGlobalProductsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_STATUS))
    .optional(),

  productType: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_TYPE))
    .optional(),

  dataSource: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_DATA_SOURCE))
    .optional(),

  // Full-text search across name, marketer, composition, keyIngredients, category
  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

export const catalogGlobalProductIdParamSchema = Joi.object({
  productId: objectId.required(),
});

export const catalogGlobalProductCodeParamSchema = Joi.object({
  productCode: Joi.string().trim().uppercase().required(),
});
