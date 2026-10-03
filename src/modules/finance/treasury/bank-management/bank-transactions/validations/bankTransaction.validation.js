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

export const createBankTransactionSchema = Joi.object({
  transactionDate: Joi.date().required().messages({
    "any.required": "Transaction date is required",
    "date.base": "Transaction date must be a valid date",
  }),

  bankAccountId: objectId.required().messages({
    "any.required": "Bank Account ID is required",
  }),

  transactionType: Joi.string()
    .valid(...VALID_TRANSACTION_TYPES)
    .required()
    .messages({
      "any.required": "Transaction type is required",
      "any.only": `Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
    }),

  direction: Joi.string().valid("CREDIT", "DEBIT").required().messages({
    "any.required": "Transaction direction is required",
    "any.only": "Direction must be CREDIT or DEBIT",
  }),

  amount: Joi.number().min(0.01).required().messages({
    "any.required": "Amount is required",
    "number.min": "Amount must be greater than zero",
    "number.base": "Amount must be a number",
  }),

  referenceNumber: Joi.string().trim().max(100).allow(null, "").optional(),

  narration: Joi.string().trim().max(500).allow(null, "").optional(),

  // Required for DEPOSIT, WITHDRAWAL, NEFT, RTGS, IMPS, UPI, CHEQUE, OTHER
  // Optional for BANK_CHARGES, INTEREST (auto-resolved)
  counterpartyAccountId: objectId.allow(null, "").optional(),
});

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
  bankAccountId: objectId.optional(),
  transactionType: Joi.string().valid(...VALID_TRANSACTION_TYPES).optional(),
  direction: Joi.string().valid("CREDIT", "DEBIT").optional(),
  status: Joi.string().valid("DRAFT", "POSTED", "CANCELLED").optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
