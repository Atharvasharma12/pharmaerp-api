import Joi from "joi";

import { WORKSPACE_TYPE } from "../../../organization/workspaces/constants/workspace.constant.js";

export const registerSchema = Joi.object({
  // ── Account fields ──────────────────────────────
  email: Joi.string().trim().lowercase().email().max(200).required(),

  password: Joi.string().min(6).max(128).required(),

  fullName: Joi.string().trim().min(3).max(120).required(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  // ── Workspace fields ─────────────────────────────
  workspaceName: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Workspace name is required",
    "string.min": "Workspace name must be at least 2 characters",
    "string.max": "Workspace name cannot exceed 100 characters",
  }),

  workspaceType: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional()
    .default("pharmacy")
    .messages({
      "any.only": `Workspace type must be one of: ${Object.values(WORKSPACE_TYPE).join(", ")}`,
    }),

  // ── Plan / Trial fields ───────────────────────────
  planId: Joi.string().hex().length(24).optional().messages({
    "string.hex": "Invalid plan ID format",
    "string.length": "Invalid plan ID format",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required(),

  password: Joi.string().min(6).max(128).required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),

  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .invalid(Joi.ref("oldPassword"))
    .messages({
      "any.invalid": "New password must be different from old password",
    }),
});

export const sendEmailOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

export const verifyEmailOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  otp: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      "string.pattern.base": "OTP must be a 6 digit number",
    }),
});
