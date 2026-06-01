import Joi from "joi";

import {
  BRANCH_STATUS,
  BRANCH_TYPE,
  BRANCH_BILLING_TYPE,
  BRANCH_INVENTORY_MODE,
  BRANCH_PRICE_MODE,
} from "../constants/branch.constant.js";

const imageSchema = Joi.object({
  publicId: Joi.string().trim().allow(null, "").optional(),

  url: Joi.string().trim().uri().required(),
});

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().max(200).allow(null, "").optional(),

  addressLine2: Joi.string().trim().max(200).allow(null, "").optional(),

  city: Joi.string().trim().max(100).allow(null, "").optional(),

  state: Joi.string().trim().max(100).allow(null, "").optional(),

  country: Joi.string().trim().max(100).allow(null, "").optional(),

  pincode: Joi.string().trim().max(20).allow(null, "").optional(),
});

const contactPersonSchema = Joi.object({
  name: Joi.string().trim().max(120).allow(null, "").optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  designation: Joi.string().trim().max(120).allow(null, "").optional(),
});

const billingSettingsSchema = Joi.object({
  billingType: Joi.string()
    .valid(...Object.values(BRANCH_BILLING_TYPE))
    .optional(),

  invoicePrefix: Joi.string().trim().max(20).optional(),

  invoiceStartNumber: Joi.number().integer().min(1).optional(),

  billPrefix: Joi.string().trim().max(20).optional(),

  billStartNumber: Joi.number().integer().min(1).optional(),

  purchasePrefix: Joi.string().trim().max(20).optional(),

  purchaseStartNumber: Joi.number().integer().min(1).optional(),

  salesReturnPrefix: Joi.string().trim().max(20).optional(),

  purchaseReturnPrefix: Joi.string().trim().max(20).optional(),
});

const inventorySettingsSchema = Joi.object({
  inventoryMode: Joi.string()
    .valid(...Object.values(BRANCH_INVENTORY_MODE))
    .optional(),

  priceMode: Joi.string()
    .valid(...Object.values(BRANCH_PRICE_MODE))
    .optional(),

  allowNegativeStock: Joi.boolean().optional(),

  allowBackdatedEntries: Joi.boolean().optional(),

  enableBatchTracking: Joi.boolean().optional(),

  enableExpiryTracking: Joi.boolean().optional(),

  enableRackTracking: Joi.boolean().optional(),
});

const settingsSchema = Joi.object({
  timezone: Joi.string().trim().max(80).optional(),

  currency: Joi.string().trim().uppercase().length(3).optional(),

  dateFormat: Joi.string().trim().max(30).optional(),

  timeFormat: Joi.string().trim().valid("12h", "24h").optional(),

  enablePurchaseModule: Joi.boolean().optional(),

  enableSalesModule: Joi.boolean().optional(),

  enableInventoryModule: Joi.boolean().optional(),

  enablePosBilling: Joi.boolean().optional(),

  defaultGstRate: Joi.number().min(0).max(100).optional(),
});

export const createBranchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),

  type: Joi.string()
    .valid(...Object.values(BRANCH_TYPE))
    .optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  address: addressSchema.optional(),

  logo: imageSchema.allow(null).optional(),

  contactPerson: contactPersonSchema.allow(null).optional(),

  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GSTIN",
    }),

  drugLicenseNumber: Joi.string()
    .trim()
    .uppercase()
    .max(100)
    .allow(null, "")
    .optional(),

  billingSettings: billingSettingsSchema.optional(),

  inventorySettings: inventorySettingsSchema.optional(),

  settings: settingsSchema.optional(),

  isPrimary: Joi.boolean().optional(),
});

export const updateBranchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).optional(),

  type: Joi.string()
    .valid(...Object.values(BRANCH_TYPE))
    .optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid phone number",
    }),

  address: addressSchema.allow(null).optional(),

  logo: imageSchema.allow(null).optional(),

  contactPerson: contactPersonSchema.allow(null).optional(),

  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GSTIN",
    }),

  drugLicenseNumber: Joi.string()
    .trim()
    .uppercase()
    .max(100)
    .allow(null, "")
    .optional(),

  billingSettings: billingSettingsSchema.optional(),

  inventorySettings: inventorySettingsSchema.optional(),

  settings: settingsSchema.optional(),

  status: Joi.string()
    .valid(...Object.values(BRANCH_STATUS))
    .optional(),

  isPrimary: Joi.boolean().optional(),
});
