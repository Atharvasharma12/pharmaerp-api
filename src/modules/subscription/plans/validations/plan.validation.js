import Joi from "joi";

import {
  PLAN_STATUS,
  PLAN_INTERVAL,
  PLAN_TYPE,
  PLAN_MODULES,
} from "../constants/plan.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const featureSchema = Joi.object({
  companiesUnlimited: Joi.boolean().optional(),

  branchesUnlimited: Joi.boolean().optional(),

  customBranding: Joi.boolean().optional(),

  prioritySupport: Joi.boolean().optional(),
});

export const createPlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  type: Joi.string()
    .valid(...Object.values(PLAN_TYPE))
    .required(),

  description: Joi.string().trim().max(1000).allow(null, "").optional(),

  pricePerUser: Joi.number().min(0).required(),

  billingCycle: Joi.string()
    .valid(...Object.values(PLAN_INTERVAL))
    .required(),

  modules: Joi.array()
    .items(Joi.string().valid(...Object.values(PLAN_MODULES)))
    .unique()
    .min(1)
    .required(),

  features: featureSchema.optional(),

  isPopular: Joi.boolean().optional(),

  trialDays: Joi.number().integer().min(0).optional(),

  sortOrder: Joi.number().integer().min(0).optional(),

  status: Joi.string()
    .valid(...Object.values(PLAN_STATUS))
    .optional(),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),

  type: Joi.string()
    .valid(...Object.values(PLAN_TYPE))
    .optional(),

  description: Joi.string().trim().max(1000).allow(null, "").optional(),

  pricePerUser: Joi.number().min(0).optional(),

  billingCycle: Joi.string()
    .valid(...Object.values(PLAN_INTERVAL))
    .optional(),

  modules: Joi.array()
    .items(Joi.string().valid(...Object.values(PLAN_MODULES)))
    .unique()
    .min(1)
    .optional(),

  features: featureSchema.optional(),

  isPopular: Joi.boolean().optional(),

  trialDays: Joi.number().integer().min(0).optional(),

  sortOrder: Joi.number().integer().min(0).optional(),

  status: Joi.string()
    .valid(...Object.values(PLAN_STATUS))
    .optional(),
});

export const planIdParamSchema = Joi.object({
  planId: objectId.required(),
});
