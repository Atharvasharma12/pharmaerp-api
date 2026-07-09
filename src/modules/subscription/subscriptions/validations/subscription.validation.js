import Joi from "joi";

import { SUBSCRIPTION_BILLING_CYCLE } from "../constants/subscription.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const renewSubscriptionSchema = Joi.object({
  subscriptionId: objectId.required(),

  billingCycle: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_BILLING_CYCLE))
    .optional(),

  seatQuantity: Joi.number().integer().min(1).optional(),
});

export const upgradeSubscriptionSchema = Joi.object({
  subscriptionId: objectId.required(),

  newPlanId: objectId.required(),

  billingCycle: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_BILLING_CYCLE))
    .optional(),

  seatQuantity: Joi.number().integer().min(1).optional(),
});

export const downgradeSubscriptionSchema = Joi.object({
  subscriptionId: objectId.required(),

  newPlanId: objectId.required(),

  billingCycle: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_BILLING_CYCLE))
    .optional(),

  seatQuantity: Joi.number().integer().min(1).optional(),
});

export const changeSeatQuantitySchema = Joi.object({
  subscriptionId: objectId.required(),

  seatQuantity: Joi.number().integer().min(1).required(),
});

export const cancelSubscriptionSchema = Joi.object({
  subscriptionId: objectId.required(),

  reason: Joi.string().trim().max(500).allow(null, "").optional(),
});

export const subscriptionIdParamSchema = Joi.object({
  subscriptionId: objectId.required(),
});

export const workspaceIdParamSchema = Joi.object({
  workspaceId: objectId.required(),
});
