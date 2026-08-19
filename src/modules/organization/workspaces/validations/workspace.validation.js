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

const branchRoleAccessValidationSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  roleId: Joi.string().hex().length(24).optional().allow(null, ""),
  canOperateMarketplaceStore: Joi.boolean().default(false),
});

export const directCreateWorkspaceMemberSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base": "Please provide a valid 10-digit Indian mobile number",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .optional()
    .allow(null, ""),
  password: Joi.string().min(6).max(128).required(),
  roleId: Joi.string().hex().length(24).optional().allow(null, ""),
  companyIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
  branchAccess: Joi.array()
    .items(branchRoleAccessValidationSchema)
    .default([]),
  accessAllCompanies: Joi.boolean().default(false),
  accessAllBranches: Joi.boolean().default(false),
}).or("email", "phone");

export const resetMemberPasswordSchema = Joi.object({
  password: Joi.string().min(6).max(128).required(),
});
