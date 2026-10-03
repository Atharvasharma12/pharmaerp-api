import mongoose from "mongoose";

import {
  MARKETPLACE_SETTINGS_STATUS,
  MARKETPLACE_SETTINGS_DEFAULTS,
} from "../constants/platformMarketplaceSettings.constant.js";

const platformMarketplaceSettingsSchema = new mongoose.Schema(
  {
    isMarketplaceEnabled: {
      type: Boolean,
      default: MARKETPLACE_SETTINGS_DEFAULTS.IS_MARKETPLACE_ENABLED,
    },

    defaultDeliveryRadiusKm: {
      type: Number,
      min: [1, "Delivery radius must be at least 1 KM"],
      max: [100, "Delivery radius cannot exceed 100 KM"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.DEFAULT_DELIVERY_RADIUS_KM,
    },

    defaultPreparationTimeMinutes: {
      type: Number,
      min: [1, "Preparation time must be at least 1 minute"],
      max: [120, "Preparation time cannot exceed 120 minutes"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.DEFAULT_PREPARATION_TIME_MINUTES,
    },

    defaultCommissionPercent: {
      type: Number,
      min: [0, "Commission cannot be negative"],
      max: [100, "Commission cannot exceed 100%"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.DEFAULT_COMMISSION_PERCENT,
    },

    safetyStockBuffer: {
      type: Number,
      min: [0, "Safety stock buffer cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.SAFETY_STOCK_BUFFER,
    },

    nearExpiryDaysThreshold: {
      type: Number,
      min: [0, "Near expiry threshold cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.NEAR_EXPIRY_DAYS_THRESHOLD,
    },

    autoRejectTimeoutSeconds: {
      type: Number,
      min: [10, "Auto reject timeout must be at least 10 seconds"],
      max: [600, "Auto reject timeout cannot exceed 600 seconds"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.AUTO_REJECT_TIMEOUT_SECONDS,
    },

    minimumOrderAmount: {
      type: Number,
      min: [0, "Minimum order amount cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.MINIMUM_ORDER_AMOUNT,
    },

    freeDeliveryThreshold: {
      type: Number,
      min: [0, "Free delivery threshold cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.FREE_DELIVERY_THRESHOLD,
    },

    defaultDeliveryCharge: {
      type: Number,
      min: [0, "Delivery charge cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.DEFAULT_DELIVERY_CHARGE,
    },

    cancellationWindowMinutes: {
      type: Number,
      min: [0, "Cancellation window cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.CANCELLATION_WINDOW_MINUTES,
    },

    returnWindowDays: {
      type: Number,
      min: [0, "Return window cannot be negative"],
      default: MARKETPLACE_SETTINGS_DEFAULTS.RETURN_WINDOW_DAYS,
    },

    status: {
      type: String,
      enum: Object.values(MARKETPLACE_SETTINGS_STATUS),
      default: MARKETPLACE_SETTINGS_STATUS.ACTIVE,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

platformMarketplaceSettingsSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.__v;

  return obj;
};

const PlatformMarketplaceSettings =
  mongoose.models.PlatformMarketplaceSettings ||
  mongoose.model(
    "PlatformMarketplaceSettings",
    platformMarketplaceSettingsSchema,
  );

export default PlatformMarketplaceSettings;
