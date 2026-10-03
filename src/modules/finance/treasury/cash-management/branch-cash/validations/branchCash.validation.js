import Joi from "joi";

const denominationSchema = Joi.object({
  denomination: Joi.number().positive().required(),
  quantity: Joi.number().integer().min(0).required(),
});

export const getBranchCashSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
});

// POST /treasury/branch-cash/initialize
export const initializeBranchCashSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  branchName: Joi.string().trim().max(160).optional().allow("", null),
  openingAmount: Joi.number().min(0).required().messages({
    "number.min": "Opening amount must be zero or greater",
  }),
  openingDenominations: Joi.array().items(denominationSchema).min(1).required().messages({
    "array.min": "At least one denomination entry is required",
  }),
  narration: Joi.string().trim().max(500).optional().allow("", null),
});

// POST /treasury/branch-cash/deposit
export const depositSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Deposit amount must be greater than zero",
  }),
  denominations: Joi.array().items(denominationSchema).min(1).required().messages({
    "array.min": "Denomination breakdown is required for all deposits",
  }),
  narration: Joi.string().trim().max(500).optional().allow("", null),
});

// POST /treasury/branch-cash/withdraw
// source discriminator: "running" | "frozen" | "bankslip"
export const withdrawSchema = Joi.object({
  branchId: Joi.string().hex().length(24).required(),
  source: Joi.string().valid("running", "frozen", "bankslip").required().messages({
    "any.only": "source must be one of: running, frozen, bankslip",
    "any.required": "source is required",
  }),
  slipId: Joi.when("source", {
    is: "bankslip",
    then: Joi.string().hex().length(24).required().messages({
      "any.required": "slipId is required when source is bankslip",
    }),
    otherwise: Joi.forbidden(),
  }),
  amount: Joi.number().positive().required().messages({
    "number.positive": "Withdrawal amount must be greater than zero",
  }),
  denominations: Joi.array().items(denominationSchema).min(1).required().messages({
    "array.min": "Denomination breakdown is required for all withdrawals",
  }),
  narration: Joi.string().trim().max(500).optional().allow("", null),
});
