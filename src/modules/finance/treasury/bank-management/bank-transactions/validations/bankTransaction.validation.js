import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid ID format",
  });

const VALID_TRANSACTION_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "CHEQUE",
  "BANK_CHARGES",
  "INTEREST",
  "OTHER",
];



export const cancelBankTransactionSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const bankTransactionIdParamSchema = Joi.object({
  bankTransactionId: objectId.required().messages({
    "any.required": "Bank Transaction ID parameter is required",
  }),
});

export const getBankTransactionsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  bankAccountId: Joi.alternatives().try(objectId, Joi.string().valid("all")).optional(),
  transactionType: Joi.string().valid(...VALID_TRANSACTION_TYPES, "all").optional(),
  direction: Joi.string().valid("CREDIT", "DEBIT", "all").optional(),
  status: Joi.string().valid("DRAFT", "POSTED", "CANCELLED", "PENDING_SHIFT_CLOSE", "all").optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
  sortBy: Joi.string().trim().optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});
