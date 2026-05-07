import Joi from "joi";

export const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(40)
    .pattern(/^[a-z0-9._-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, dot, underscore and hyphen",
    }),

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
});

export const loginSchema = Joi.object({
  identifier: Joi.string().trim().lowercase().required(),
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
