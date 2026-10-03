import Joi from "joi";

import { STORE_VERIFICATION_STATUS } from "../constants/platformStoreVerification.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const storeIdParamSchema = Joi.object({
  storeId: objectId.required(),
});

export const approveStoreSchema = Joi.object({
  reviewNotes: Joi.string().trim().max(1000).allow(null, "").optional(),
});

export const rejectStoreSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(5).max(1000).required(),

  reviewNotes: Joi.string().trim().max(1000).allow(null, "").optional(),
});

export const suspendStoreSchema = Joi.object({
  suspensionReason: Joi.string().trim().min(5).max(1000).required(),
});

export const listVerificationsQuerySchema = Joi.object({
  verificationStatus: Joi.string()
    .valid(...Object.values(STORE_VERIFICATION_STATUS))
    .optional(),

  workspaceId: objectId.optional(),
});
