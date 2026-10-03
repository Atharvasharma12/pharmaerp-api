import Joi from "joi";

export const platformLoginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().min(6).max(128).required(),
});

export default {
  platformLoginSchema,
};
