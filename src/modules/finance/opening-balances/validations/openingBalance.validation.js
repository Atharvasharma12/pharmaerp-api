import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const setAccountOpeningBalanceSchema = Joi.object({
  accountId: objectId.required(),
  amount: Joi.number().min(0).required(),
  balanceType: Joi.string().valid("dr", "cr").lowercase().required(),
});

export const setCustomerOpeningBalanceSchema = Joi.object({
  customerId: objectId.required(),
  amount: Joi.number().min(0).required(),
  balanceType: Joi.string().valid("dr", "cr").lowercase().required(),
});

export const setSupplierOpeningBalanceSchema = Joi.object({
  supplierId: objectId.required(),
  amount: Joi.number().min(0).required(),
  balanceType: Joi.string().valid("dr", "cr").lowercase().required(),
});
