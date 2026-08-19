import Joi from "joi";

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

  // Workspace and plan fields are now auto-derived on the backend
  // (workspaceName auto-generated from fullName, type always "pharmacy")
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().optional(),
  identifier: Joi.string().trim().optional(),
  phone: Joi.string().trim().optional(),
  password: Joi.string().required(),
}).or("email", "identifier", "phone");

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
