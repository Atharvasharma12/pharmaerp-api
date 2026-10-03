import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid ID format" });

export const createChequeSchema = Joi.object({
  chequeType: Joi.string().valid("RECEIVED", "ISSUED").required().messages({
    "any.required": "Cheque type is required",
    "any.only": "Cheque type must be RECEIVED or ISSUED",
  }),
  chequeNumber: Joi.string().trim().min(1).max(50).required().messages({
    "any.required": "Cheque number is required",
  }),
  chequeDate: Joi.date().iso().required().messages({
    "any.required": "Cheque date is required",
    "date.format": "Cheque date must be a valid ISO date",
  }),
  bankAccountId: objectId.required().messages({
    "any.required": "Bank Account ID is required",
  }),
  counterpartyAccountId: objectId.required().messages({
    "any.required": "Counterparty account ID is required",
  }),
  partyName: Joi.string().trim().min(2).max(200).required().messages({
    "any.required": "Party name is required",
  }),
  amount: Joi.number().positive().required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than zero",
  }),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const clearChequeSchema = Joi.object({
  clearDate: Joi.date().iso().optional(),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const bounceChequeSchema = Joi.object({
  reason: Joi.string().trim().max(500).required().messages({
    "any.required": "Bounce reason is required",
  }),
  bounceCharges: Joi.number().min(0).default(0).optional(),
});

export const cancelChequeSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const chequeIdParamSchema = Joi.object({
  chequeId: objectId.required().messages({
    "any.required": "Cheque ID parameter is required",
  }),
});

export const getChequesQuerySchema = Joi.object({
  chequeType: Joi.string().valid("RECEIVED", "ISSUED").optional(),
  status: Joi.string()
    .valid("PENDING", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED")
    .optional(),
  bankAccountId: objectId.optional(),
  counterpartyAccountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
