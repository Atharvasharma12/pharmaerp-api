import Joi from "joi";

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(120).optional(),
});

export const updateAvatarSchema = Joi.object({
  avatar: Joi.object({
    publicId: Joi.string().trim().allow(null, "").optional(),

    url: Joi.string().trim().uri().required(),
  }).required(),
});

export const updateEmailSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(200).required(),
});

export const updatePhoneSchema = Joi.object({
  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),
});
