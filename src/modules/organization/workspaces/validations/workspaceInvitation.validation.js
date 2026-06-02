import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const inviteWorkspaceMemberSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(200).required(),

  roleId: objectId.allow(null).optional(),

  notes: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const cancelWorkspaceInvitationSchema = Joi.object({});

export const acceptWorkspaceInvitationSchema = Joi.object({});
