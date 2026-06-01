// src/modules/core/access-control/validations/memberAccess.validation.js

import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const updateMemberAccessSchema = Joi.object({
  accessAllCompanies: Joi.boolean().optional(),

  accessAllBranches: Joi.boolean().optional(),

  companyIds: Joi.array().items(objectId).unique().default([]).optional(),

  branchIds: Joi.array().items(objectId).unique().default([]).optional(),
}).custom((value, helpers) => {
  if (value.accessAllCompanies === false && !value.companyIds?.length) {
    return helpers.message(
      "companyIds is required when accessAllCompanies is false",
    );
  }

  if (value.accessAllBranches === false && !value.branchIds?.length) {
    return helpers.message(
      "branchIds is required when accessAllBranches is false",
    );
  }

  return value;
});
