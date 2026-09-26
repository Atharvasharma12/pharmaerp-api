import Joi from "joi";

import {
  ACCOUNT_NATURE,
  ACCOUNT_CATEGORY,
  ACCOUNT_OPENING_BALANCE_TYPE,
  ACCOUNT_STATUS,
} from "../constants/account.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const createAccountSchema = Joi.object({
  accountCode: Joi.string().trim().uppercase().min(2).max(50).required(),
  accountName: Joi.string().trim().min(2).max(120).required(),
  accountGroupId: objectId.required(),
  accountCategory: Joi.string()
    .valid(...Object.values(ACCOUNT_CATEGORY))
    .required(),
  openingBalance: Joi.number().min(0).optional(),
  openingBalanceType: Joi.string()
    .valid(...Object.values(ACCOUNT_OPENING_BALANCE_TYPE))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_STATUS))
    .optional(),
});

export const updateAccountSchema = Joi.object({
  accountName: Joi.string().trim().min(2).max(120).optional(),
  accountGroupId: objectId.optional(),
  openingBalance: Joi.number().min(0).optional(),
  openingBalanceType: Joi.string()
    .valid(...Object.values(ACCOUNT_OPENING_BALANCE_TYPE))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_STATUS))
    .optional(),
}).min(1);

export const accountIdParamSchema = Joi.object({
  accountId: objectId.required(),
});

export const getAccountsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  accountGroupId: objectId.optional(),
  accountNature: Joi.string()
    .valid(...Object.values(ACCOUNT_NATURE))
    .optional(),
  accountCategory: Joi.string()
    .valid(...Object.values(ACCOUNT_CATEGORY))
    .optional(),
  excludeCategories: Joi.string().optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_STATUS))
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
