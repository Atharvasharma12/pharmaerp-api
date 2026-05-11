import Joi from "joi";

import {
  WORKSPACE_TYPE,
  WORKSPACE_MEMBER_STATUS,
} from "../constants/workspace.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const imageSchema = Joi.object({
  publicId: Joi.string().trim().allow(null, "").optional(),

  url: Joi.string().trim().uri().required(),
});

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().max(200).allow(null, "").optional(),

  addressLine2: Joi.string().trim().max(200).allow(null, "").optional(),

  city: Joi.string().trim().max(100).allow(null, "").optional(),

  state: Joi.string().trim().max(100).allow(null, "").optional(),

  country: Joi.string().trim().max(100).allow(null, "").optional(),

  pincode: Joi.string().trim().max(20).allow(null, "").optional(),
});

const settingsSchema = Joi.object({
  timezone: Joi.string().trim().max(80).optional(),

  currency: Joi.string().trim().uppercase().length(3).optional(),

  dateFormat: Joi.string().trim().max(30).optional(),

  timeFormat: Joi.string().trim().valid("12h", "24h").optional(),
});

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  type: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  address: addressSchema.optional(),

  logo: imageSchema.allow(null).optional(),

  settings: settingsSchema.optional(),
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),

  type: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  address: addressSchema.allow(null).optional(),

  logo: imageSchema.allow(null).optional(),

  settings: settingsSchema.optional(),
});

export const addWorkspaceMemberSchema = Joi.object({
  userId: objectId.required(),

  notes: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const updateWorkspaceMemberStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      WORKSPACE_MEMBER_STATUS.ACTIVE,
      WORKSPACE_MEMBER_STATUS.INACTIVE,
      WORKSPACE_MEMBER_STATUS.SUSPENDED,
    )
    .required(),
});
