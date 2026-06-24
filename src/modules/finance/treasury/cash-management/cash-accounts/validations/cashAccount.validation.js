import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid ID format",
  });

export const createCashAccountSchema = Joi.object({
  accountName: Joi.string().trim().min(2).max(120).required().messages({
    "any.required": "Account name is required",
    "string.empty": "Account name cannot be empty",
    "string.min": "Account name must be at least 2 characters",
    "string.max": "Account name cannot exceed 120 characters",
  }),
  description: Joi.string().trim().max(500).allow(null, "").optional(),
  openingBalance: Joi.number().min(0).default(0).optional().messages({
    "number.min": "Opening balance cannot be negative",
  }),
  isPrimary: Joi.boolean().default(false).optional(),
});

export const updateCashAccountSchema = Joi.object({
  accountName: Joi.string().trim().min(2).max(120).optional().messages({
    "string.min": "Account name must be at least 2 characters",
    "string.max": "Account name cannot exceed 120 characters",
  }),
  description: Joi.string().trim().max(500).allow(null, "").optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  isPrimary: Joi.boolean().optional(),
}).min(1);

export const cashAccountIdParamSchema = Joi.object({
  cashAccountId: objectId.required().messages({
    "any.required": "Cash Account ID parameter is required",
  }),
});

export const getCashAccountsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  isPrimary: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
