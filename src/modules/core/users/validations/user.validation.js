import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

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

export const updateActiveContextSchema = Joi.object({
  workspaceId: objectId.allow(null, "").optional(),

  companyId: objectId.allow(null, "").optional(),

  branchId: objectId.allow(null, "").optional(),
}).custom((value, helpers) => {
  if (value.branchId && !value.companyId) {
    return helpers.message("companyId is required when branchId is provided");
  }

  if ((value.companyId || value.branchId) && !value.workspaceId) {
    return helpers.message(
      "workspaceId is required when companyId or branchId is provided",
    );
  }

  return value;
});
