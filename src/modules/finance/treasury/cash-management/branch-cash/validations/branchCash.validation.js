import Joi from "joi";

const denominationSchema = Joi.object({
  denomination: Joi.number().positive().required(),
  quantity: Joi.number().integer().min(0).required(),
});

export const getBranchCashSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
});

export const depositSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Deposit amount must be greater than zero",
  }),
  denominations: Joi.array().items(denominationSchema).optional().default([]),
  narration: Joi.string().trim().max(500).optional().allow("", null),
});

export const withdrawSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Withdrawal amount must be greater than zero",
  }),
  denominations: Joi.array().items(denominationSchema).optional().default([]),
  narration: Joi.string().trim().max(500).optional().allow("", null),
});
