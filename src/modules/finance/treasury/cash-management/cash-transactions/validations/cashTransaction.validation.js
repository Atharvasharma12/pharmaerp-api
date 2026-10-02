import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid ID format",
  });

const VALID_TRANSACTION_TYPES = [
  "CASH_IN",
  "CASH_OUT",
  "EXPENSE",
  "PETTY_CASH",
  "OTHER",
];

const VALID_DIRECTIONS = ["CREDIT", "DEBIT"];

// Valid Indian currency denominations
const VALID_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const denominationLineSchema = Joi.object({
  denomination: Joi.number()
    .valid(...VALID_DENOMINATIONS)
    .required()
    .messages({
      "any.required": "Denomination value is required",
      "any.only": `Denomination must be one of: ${VALID_DENOMINATIONS.join(", ")}`,
    }),
  quantity: Joi.number().integer().min(0).required().messages({
    "any.required": "Quantity is required",
    "number.min": "Quantity cannot be negative",
  }),
});

export const createCashTransactionSchema = Joi.object({
  transactionDate: Joi.date().iso().required().messages({
    "any.required": "Transaction date is required",
    "date.format": "Transaction date must be a valid ISO date",
  }),
  branchId: objectId.required().messages({
    "any.required": "Branch ID is required",
  }),
  partition: Joi.string().valid("running", "frozen").default("running"),
  transactionType: Joi.string()
    .valid(...VALID_TRANSACTION_TYPES)
    .required()
    .messages({
      "any.required": "Transaction type is required",
      "any.only": `Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
    }),
  direction: Joi.string()
    .valid(...VALID_DIRECTIONS)
    .required()
    .messages({
      "any.required": "Direction is required",
      "any.only": "Direction must be CREDIT or DEBIT",
    }),
  amount: Joi.number().positive().required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than zero",
  }),
  referenceNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
  counterpartyAccountId: objectId.allow(null).optional(),
  // REQUIRED: denomination breakdown is mandatory for all cash movements
  denominations: Joi.array()
    .items(denominationLineSchema)
    .min(1)
    .required()
    .messages({
      "any.required": "Denomination breakdown is required for all cash transactions",
      "array.min": "At least one denomination line is required",
      "array.base": "Denominations must be an array",
    }),
});



export const cancelCashTransactionSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const cashTransactionIdParamSchema = Joi.object({
  cashTransactionId: objectId.required().messages({
    "any.required": "Cash Transaction ID parameter is required",
  }),
});

export const getCashTransactionsQuerySchema = Joi.object({
  branchId: objectId.optional(),
  partition: Joi.string().valid("running", "frozen").optional(),
  transactionType: Joi.string().valid(...VALID_TRANSACTION_TYPES).optional(),
  direction: Joi.string().valid(...VALID_DIRECTIONS).optional(),
  status: Joi.string().valid("DRAFT", "POSTED", "CANCELLED").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
