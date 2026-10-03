import Joi from "joi";

import { PLATFORM_ROLE_LIST } from "../../../../constants/platformRoles.constant.js";

import { PLATFORM_USER_STATUS_LIST } from "../../../../constants/platformStatus.constant.js";

export const createPlatformUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  email: Joi.string().trim().lowercase().email().max(200).required(),

  password: Joi.string().min(6).max(128).required(),

  role: Joi.string()
    .valid(...PLATFORM_ROLE_LIST)
    .required(),

  status: Joi.string()
    .valid(...PLATFORM_USER_STATUS_LIST)
    .optional(),
});

export const updatePlatformUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),

  email: Joi.string().trim().lowercase().email().max(200).optional(),

  role: Joi.string()
    .valid(...PLATFORM_ROLE_LIST)
    .optional(),

  status: Joi.string()
    .valid(...PLATFORM_USER_STATUS_LIST)
    .optional(),

  avatar: Joi.object({
    publicId: Joi.string().trim().allow(null, "").optional(),

    url: Joi.string().trim().uri().required(),
  }).optional(),
});

export default {
  createPlatformUserSchema,
  updatePlatformUserSchema,
};
