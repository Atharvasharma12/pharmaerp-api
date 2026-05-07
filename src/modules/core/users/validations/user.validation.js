import Joi from "joi";

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(120).optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),
});

export const updateAvatarSchema = Joi.object({
  avatar: Joi.object({
    publicId: Joi.string().trim().allow(null, "").optional(),
    url: Joi.string().trim().uri().required(),
  }).required(),
});

export const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});
