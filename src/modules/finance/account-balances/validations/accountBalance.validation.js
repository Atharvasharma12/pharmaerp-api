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
  balanceType: Joi.string()
    .valid(...Object.values(ACCOUNT_BALANCE_TYPE))
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
