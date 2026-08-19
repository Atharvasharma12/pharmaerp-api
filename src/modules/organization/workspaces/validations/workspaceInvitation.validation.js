import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const branchAccessItemSchema = Joi.object({
  branchId: objectId.required(),
  roleId: objectId.allow(null).optional(),
  canOperateMarketplaceStore: Joi.boolean().optional().default(false),
});

export const inviteWorkspaceMemberSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(200).required(),

  roleId: objectId.allow(null).optional(),
  defaultRoleId: objectId.allow(null).optional(),

  accessAllCompanies: Joi.boolean().optional().default(false),
  accessAllBranches: Joi.boolean().optional().default(false),

  companyIds: Joi.array().items(objectId).optional().default([]),
  branchIds: Joi.array().items(objectId).optional().default([]),
  branchAccess: Joi.array().items(branchAccessItemSchema).optional().default([]),

  notes: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const updateWorkspaceInvitationSchema = Joi.object({
  roleId: objectId.allow(null).optional(),
  defaultRoleId: objectId.allow(null).optional(),

  accessAllCompanies: Joi.boolean().optional(),
  accessAllBranches: Joi.boolean().optional(),

  companyIds: Joi.array().items(objectId).optional(),
  branchIds: Joi.array().items(objectId).optional(),
  branchAccess: Joi.array().items(branchAccessItemSchema).optional(),

  notes: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const cancelWorkspaceInvitationSchema = Joi.object({});

export const resendWorkspaceInvitationSchema = Joi.object({});

export const acceptWorkspaceInvitationSchema = Joi.object({});

export const acceptWorkspaceInvitationSignupSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(6).max(128).required(),
  phone: Joi.string().trim().allow(null, "").optional(),
});
