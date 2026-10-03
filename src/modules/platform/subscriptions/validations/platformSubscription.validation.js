import Joi from "joi";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
  SUBSCRIPTION_BILLING_CYCLE,
} from "../../../subscription/subscriptions/constants/subscription.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const platformSubscriptionIdParamSchema = Joi.object({
  subscriptionId: objectId.required(),
});

export const platformWorkspaceIdParamSchema = Joi.object({
  workspaceId: objectId.required(),
});

export const updatePlatformSubscriptionStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_STATUS))
    .required(),
});

export const updatePlatformSubscriptionPaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_PAYMENT_STATUS))
    .required(),
});

export const renewPlatformSubscriptionSchema = Joi.object({
  billingCycle: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_BILLING_CYCLE))
    .optional(),

  seatQuantity: Joi.number().integer().min(1).optional(),
}).min(1);

export const changePlatformSubscriptionPlanSchema = Joi.object({
  newPlanId: objectId.required(),

  billingCycle: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_BILLING_CYCLE))
    .optional(),

  seatQuantity: Joi.number().integer().min(1).optional(),
});

export const cancelPlatformSubscriptionSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const extendPlatformSubscriptionTrialSchema = Joi.object({
  trialDays: Joi.number().integer().min(1).max(365).required(),
});
