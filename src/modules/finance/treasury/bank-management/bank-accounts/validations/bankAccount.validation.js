import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid ID format",
  });

export const createBankAccountSchema = Joi.object({
  bankMasterId: objectId.required().messages({
    "any.required": "Bank Master ID is required",
  }),
  accountName: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Account name is required",
    "string.empty": "Account name cannot be empty",
  }),
  accountHolderName: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Account holder name is required",
    "string.empty": "Account holder name cannot be empty",
  }),
  accountNumber: Joi.string().trim().min(5).max(30).required().messages({
    "any.required": "Account number is required",
    "string.empty": "Account number cannot be empty",
  }),
  ifscCode: Joi.string()
    .trim()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      "any.required": "IFSC code is required",
      "string.pattern.base": "Invalid IFSC code format (e.g. HDFC0001234)",
    }),
  branchName: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Branch name is required",
    "string.empty": "Branch name cannot be empty",
  }),
  branchAddress: Joi.string().trim().max(250).allow(null, "").optional(),
  registeredMobile: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number format",
    }),
  accountType: Joi.string()
    .valid("CURRENT", "SAVINGS", "OVERDRAFT", "CASH_CREDIT")
    .default("CURRENT")
    .optional(),
  isPrimary: Joi.boolean().default(false).optional(),
  openingBalance: Joi.number().min(0).default(0).optional().messages({
    "number.min": "Opening balance cannot be negative",
  }),
  openingBalanceType: Joi.string()
    .valid("dr", "cr")
    .lowercase()
    .default("dr")
    .optional()
    .messages({
      "any.only": "Opening balance type must be 'dr' or 'cr'",
    }),
});

export const updateBankAccountSchema = Joi.object({
  accountName: Joi.string().trim().min(2).max(100).optional(),
  accountHolderName: Joi.string().trim().min(2).max(100).optional(),
  ifscCode: Joi.string()
    .trim()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid IFSC code format (e.g. HDFC0001234)",
    }),
  branchName: Joi.string().trim().min(2).max(100).optional(),
  branchAddress: Joi.string().trim().max(250).allow(null, "").optional(),
  registeredMobile: Joi.string()
    .trim()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number format",
    }),
  accountType: Joi.string()
    .valid("CURRENT", "SAVINGS", "OVERDRAFT", "CASH_CREDIT")
    .optional(),
  isActive: Joi.boolean().optional(),
  isPrimary: Joi.boolean().optional(),
}).min(1);

export const bankAccountIdParamSchema = Joi.object({
  bankAccountId: objectId.required().messages({
    "any.required": "Bank Account ID parameter is required",
  }),
});

export const getBankAccountsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  isActive: Joi.boolean().optional(),
  isPrimary: Joi.boolean().optional(),
  bankMasterId: objectId.optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
