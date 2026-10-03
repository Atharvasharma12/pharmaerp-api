import Joi from "joi";

import { MARKETPLACE_SETTINGS_STATUS } from "../constants/platformMarketplaceSettings.constant.js";

export const updateMarketplaceSettingsSchema = Joi.object({
  isMarketplaceEnabled: Joi.boolean().optional(),

  defaultDeliveryRadiusKm: Joi.number().min(1).max(100).optional(),

  defaultPreparationTimeMinutes: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .optional(),

  defaultCommissionPercent: Joi.number().min(0).max(100).optional(),

  safetyStockBuffer: Joi.number().integer().min(0).optional(),

  nearExpiryDaysThreshold: Joi.number().integer().min(0).optional(),

  autoRejectTimeoutSeconds: Joi.number()
    .integer()
    .min(10)
    .max(600)
    .optional(),

  minimumOrderAmount: Joi.number().min(0).optional(),

  freeDeliveryThreshold: Joi.number().min(0).optional(),

  defaultDeliveryCharge: Joi.number().min(0).optional(),

  cancellationWindowMinutes: Joi.number().integer().min(0).optional(),

  returnWindowDays: Joi.number().integer().min(0).optional(),

  status: Joi.string()
    .valid(...Object.values(MARKETPLACE_SETTINGS_STATUS))
    .optional(),
}).min(1);
