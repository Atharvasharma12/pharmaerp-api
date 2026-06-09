import Joi from "joi";

import {
  WORKSPACE_TYPE,
  WORKSPACE_MEMBER_STATUS,
} from "../constants/workspace.constant.js";

const imageSchema = Joi.object({
  publicId: Joi.string().trim().allow(null, "").optional(),

  url: Joi.string().trim().uri().allow(null, "").optional(),
});

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  type: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional(),

  logo: imageSchema.allow(null).optional(),
});

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),

  type: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional(),

  logo: imageSchema.allow(null).optional(),
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
