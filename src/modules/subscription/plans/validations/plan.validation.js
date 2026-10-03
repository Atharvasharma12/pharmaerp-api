import Joi from "joi";

import {
  PLAN_TYPE,
  PLAN_INTERVAL,
  PLAN_MODULES,
  PLAN_STATUS,
} from "../constants/plan.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

// ─── Limits sub-schema ────────────────────────────────────────────────────────

const limitsSchema = Joi.object({
  maxCompanies: Joi.number().integer().min(1).required().messages({
    "number.min": "Max companies must be at least 1",
    "any.required": "maxCompanies is required",
  }),

  maxBranches: Joi.number().integer().min(1).required().messages({
    "number.min": "Max branches must be at least 1",
    "any.required": "maxBranches is required",
  }),

  maxUsers: Joi.number().integer().min(1).required().messages({
    "number.min": "Max users must be at least 1",
    "any.required": "maxUsers is required",
  }),
});

// ─── Features sub-schema ──────────────────────────────────────────────────────

const featuresSchema = Joi.object({
  customBranding: Joi.boolean().optional(),
  prioritySupport: Joi.boolean().optional(),
});

// ─── Feature items ────────────────────────────────────────────────────────────

const featureItemSchema = Joi.object({
  key: Joi.string().trim().lowercase().required(),
  label: Joi.string().trim().required(),
  value: Joi.string().trim().required(),
  included: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createPlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().messages({
    "any.required": "Plan name is required",
    "string.min": "Plan name must be at least 2 characters",
  }),

  type: Joi.string()
    .valid(...Object.values(PLAN_TYPE))
    .required()
    .messages({
      "any.required": "Plan type is required",
      "any.only": `Plan type must be one of: ${Object.values(PLAN_TYPE).join(", ")}`,
    }),

  description: Joi.string().trim().max(1000).allow(null, "").optional(),

  pricePerUser: Joi.number().min(0).required().messages({
    "any.required": "Price per user is required",
    "number.min": "Price cannot be negative",
  }),

  billingCycle: Joi.string()
    .valid(...Object.values(PLAN_INTERVAL))
    .optional()
    .default(PLAN_INTERVAL.MONTHLY),

  modules: Joi.array()
    .items(Joi.string().valid(...Object.values(PLAN_MODULES)))
    .optional()
    .default([]),

  features: featuresSchema.optional(),

  /**
   * Hard limits — required for all plans.
   * For free plans, admin can supply custom values (not forced to PLAN_LIMITS.FREE).
   */
  limits: limitsSchema.required().messages({
    "any.required": "Plan limits (maxCompanies, maxBranches, maxUsers) are required",
  }),

  featureItems: Joi.array().items(featureItemSchema).optional().default([]),

  isPopular: Joi.boolean().optional().default(false),

  sortOrder: Joi.number().integer().optional().default(0),

  status: Joi.string()
    .valid(...Object.values(PLAN_STATUS))
    .optional()
    .default(PLAN_STATUS.ACTIVE),
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
    .optional(),

  features: featuresSchema.optional(),

  // Admin can update limits on any plan — including the free plan
  limits: Joi.object({
    maxCompanies: Joi.number().integer().min(1).optional(),
    maxBranches: Joi.number().integer().min(1).optional(),
    maxUsers: Joi.number().integer().min(1).optional(),
  }).optional(),

  featureItems: Joi.array().items(featureItemSchema).optional(),

  isPopular: Joi.boolean().optional(),

  sortOrder: Joi.number().integer().optional(),

  status: Joi.string()
    .valid(...Object.values(PLAN_STATUS))
    .optional(),
}).min(1); // At least one field must be provided for an update

export const planIdParamSchema = Joi.object({
  planId: objectId.required(),
});
