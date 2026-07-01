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

export const setBankAccountOpeningBalanceSchema = Joi.object({
  bankAccountId: objectId.required().messages({
    "any.required": "Bank Account ID is required",
  }),
  amount: Joi.number().min(0).required().messages({
    "any.required": "Amount is required",
    "number.min": "Amount cannot be negative",
  }),
  balanceType: Joi.string().valid("dr", "cr").lowercase().required().messages({
    "any.required": "Balance type is required",
    "any.only": "Balance type must be 'dr' or 'cr'",
  }),
});

export const setCashAccountOpeningBalanceSchema = Joi.object({
  cashAccountId: objectId.required().messages({
    "any.required": "Cash Account ID is required",
  }),
  amount: Joi.number().min(0).required().messages({
    "any.required": "Amount is required",
    "number.min": "Amount cannot be negative",
  }),
  balanceType: Joi.string().valid("dr", "cr").lowercase().required().messages({
    "any.required": "Balance type is required",
    "any.only": "Balance type must be 'dr' or 'cr'",
  }),
});
