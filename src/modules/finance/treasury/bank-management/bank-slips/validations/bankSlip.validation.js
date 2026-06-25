import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid ID format" });

export const createBankSlipSchema = Joi.object({
  bankAccountId: objectId.required().messages({
    "any.required": "Bank Account ID is required",
  }),
  slipType: Joi.string()
    .valid("CASH_DEPOSIT", "CASH_WITHDRAWAL")
    .required()
    .messages({
      "any.required": "Slip type is required",
      "any.only": "Slip type must be CASH_DEPOSIT or CASH_WITHDRAWAL",
    }),
  bankSlipReference: Joi.string().trim().max(100).allow(null, "").optional(),
  slipDate: Joi.date().iso().required().messages({
    "any.required": "Slip date is required",
    "date.format": "Slip date must be a valid ISO date",
  }),
  amount: Joi.number().positive().required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than zero",
  }),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const submitBankSlipSchema = Joi.object({
  bankSlipReference: Joi.string().trim().max(100).allow(null, "").optional(),
});

export const confirmBankSlipSchema = Joi.object({
  confirmDate: Joi.date().iso().optional(),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const rejectBankSlipSchema = Joi.object({
  reason: Joi.string().trim().max(500).required().messages({
    "any.required": "Rejection reason is required",
  }),
});

export const cancelBankSlipSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const bankSlipIdParamSchema = Joi.object({
  bankSlipId: objectId.required().messages({
    "any.required": "Bank Slip ID parameter is required",
  }),
});

export const getBankSlipsQuerySchema = Joi.object({
  bankAccountId: objectId.optional(),
  slipType: Joi.string().valid("CASH_DEPOSIT", "CASH_WITHDRAWAL").optional(),
  status: Joi.string()
    .valid("PENDING", "SUBMITTED", "CONFIRMED", "REJECTED", "CANCELLED")
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
