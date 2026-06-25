import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid ID format" });

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

export const createCashDenominationSchema = Joi.object({
  cashAccountId: objectId.required().messages({
    "any.required": "Cash Account ID is required",
  }),
  countDate: Joi.date().iso().required().messages({
    "any.required": "Count date is required",
    "date.format": "Count date must be a valid ISO date",
  }),
  denominations: Joi.array()
    .items(denominationLineSchema)
    .min(1)
    .required()
    .messages({
      "any.required": "Denominations are required",
      "array.min": "At least one denomination line is required",
    }),
  expectedBalance: Joi.number().min(0).default(0).optional().messages({
    "number.min": "Expected balance cannot be negative",
  }),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const confirmCashDenominationSchema = Joi.object({
  // If true, creates a journal adjustment entry for the variance
  adjustVariance: Joi.boolean().default(false).optional(),
});

export const cancelCashDenominationSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const cashDenominationIdParamSchema = Joi.object({
  cashDenominationId: objectId.required().messages({
    "any.required": "Cash Denomination ID parameter is required",
  }),
});

export const getCashDenominationsQuerySchema = Joi.object({
  cashAccountId: objectId.optional(),
  status: Joi.string().valid("DRAFT", "CONFIRMED", "CANCELLED").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
