import Joi from "joi";
import { ACCOUNT_BALANCE_TYPE } from "../constants/accountBalance.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const accountIdParamSchema = Joi.object({
  accountId: objectId.required(),
});

export const getBalancesQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  balanceType: Joi.string().trim().lowercase().valid("dr", "cr", "all", "").optional(),
  accountNature: Joi.string().trim().allow("").optional(),
  accountCategory: Joi.string().trim().allow("").optional(),
  accountScope: Joi.string()
    .trim()
    .lowercase()
    .valid("company", "general", "customer", "supplier", "all", "")
    .default("company")
    .optional(),
  sortBy: Joi.string().trim().allow("").optional(),
  sortOrder: Joi.string().trim().lowercase().valid("asc", "desc", "").optional(),
  branchId: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(10).optional(),
  all: Joi.boolean().default(false).optional(),
}).unknown(true);
