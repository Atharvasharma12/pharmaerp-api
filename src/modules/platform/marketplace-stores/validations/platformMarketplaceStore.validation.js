import Joi from "joi";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../../marketplace/stores/constants/marketplaceStore.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid id" });

export const storeIdParamSchema = Joi.object({
  storeId: objectId.required(),
});

export const setOnlineStatusSchema = Joi.object({
  onlineStatus: Joi.string()
    .valid(...Object.values(MARKETPLACE_STORE_ONLINE_STATUS))
    .required()
    .messages({ "any.required": "onlineStatus is required" }),
});

export const listStoresQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MARKETPLACE_STORE_STATUS))
    .optional(),

  verificationStatus: Joi.string()
    .valid(...Object.values(MARKETPLACE_STORE_VERIFICATION_STATUS))
    .optional(),

  onlineStatus: Joi.string()
    .valid(...Object.values(MARKETPLACE_STORE_ONLINE_STATUS))
    .optional(),

  workspaceId: objectId.optional(),

  search: Joi.string().trim().max(100).optional(),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(20),
});
