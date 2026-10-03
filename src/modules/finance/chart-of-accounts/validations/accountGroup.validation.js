import Joi from "joi";

import {
  ACCOUNT_GROUP_NATURE,
  ACCOUNT_GROUP_STATUS,
} from "../constants/accountGroup.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const createAccountGroupSchema = Joi.object({
  groupCode: Joi.string().trim().uppercase().min(2).max(50).required(),
  groupName: Joi.string().trim().min(2).max(100).required(),
  parentGroupId: objectId.allow(null, "").optional(),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_NATURE))
    .required(),
  description: Joi.string().trim().max(1000).allow(null, "").optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_STATUS))
    .optional(),
});

export const updateAccountGroupSchema = Joi.object({
  groupName: Joi.string().trim().min(2).max(100).optional(),
  parentGroupId: objectId.allow(null, "").optional(),
  description: Joi.string().trim().max(1000).allow(null, "").optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_STATUS))
    .optional(),
}).min(1);

export const accountGroupIdParamSchema = Joi.object({
  accountGroupId: objectId.required(),
});

export const getAccountGroupsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  nature: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_NATURE))
    .optional(),
  parentGroupId: objectId.allow(null, "").optional(),
  status: Joi.string()
    .valid(...Object.values(ACCOUNT_GROUP_STATUS))
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
