import Joi from "joi";

import {
  COMPANY_STATUS,
  COMPANY_TYPE,
  COMPANY_LICENSE_STATUS,
  COMPANY_GST_TYPE,
  COMPANY_BILLING_TYPE,
} from "../constants/company.constant.js";

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

const licenseSchema = Joi.object({
  licenseNumber: Joi.string().trim().max(100).allow(null, "").optional(),

  issuedAt: Joi.date().allow(null).optional(),

  expiresAt: Joi.date().allow(null).optional(),

  status: Joi.string()
    .valid(...Object.values(COMPANY_LICENSE_STATUS))
    .optional(),

  document: imageSchema.allow(null).optional(),
});

const taxSettingsSchema = Joi.object({
  gstType: Joi.string()
    .valid(...Object.values(COMPANY_GST_TYPE))
    .optional(),

  billingType: Joi.string()
    .valid(...Object.values(COMPANY_BILLING_TYPE))
    .optional(),

  defaultGstRate: Joi.number().min(0).max(100).optional(),

  isGstInclusive: Joi.boolean().optional(),
});

const billingSettingsSchema = Joi.object({
  invoicePrefix: Joi.string().trim().max(20).optional(),

  invoiceStartNumber: Joi.number().integer().min(1).optional(),

  purchasePrefix: Joi.string().trim().max(20).optional(),

  purchaseStartNumber: Joi.number().integer().min(1).optional(),

  salesReturnPrefix: Joi.string().trim().max(20).optional(),

  purchaseReturnPrefix: Joi.string().trim().max(20).optional(),
});

const settingsSchema = Joi.object({
  timezone: Joi.string().trim().max(80).optional(),

  currency: Joi.string().trim().uppercase().length(3).optional(),

  dateFormat: Joi.string().trim().max(30).optional(),

  timeFormat: Joi.string().trim().valid("12h", "24h").optional(),

  allowNegativeStock: Joi.boolean().optional(),

  allowBackdatedEntries: Joi.boolean().optional(),

  enableBatchTracking: Joi.boolean().optional(),

  enableExpiryTracking: Joi.boolean().optional(),

  enablePurchaseModule: Joi.boolean().optional(),

  enableSalesModule: Joi.boolean().optional(),

  enableInventoryModule: Joi.boolean().optional(),
});

export const createCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),

  type: Joi.string()
    .valid(...Object.values(COMPANY_TYPE))
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

  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GSTIN",
    }),

  pan: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid PAN number",
    }),

  drugLicense: licenseSchema.allow(null).optional(),

  foodLicense: licenseSchema.allow(null).optional(),

  tradeLicense: licenseSchema.allow(null).optional(),

  taxSettings: taxSettingsSchema.optional(),

  billingSettings: billingSettingsSchema.optional(),

  settings: settingsSchema.optional(),
});

export const updateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).optional(),

  type: Joi.string()
    .valid(...Object.values(COMPANY_TYPE))
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

  gstin: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GSTIN",
    }),

  pan: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid PAN number",
    }),

  drugLicense: licenseSchema.allow(null).optional(),

  foodLicense: licenseSchema.allow(null).optional(),

  tradeLicense: licenseSchema.allow(null).optional(),

  taxSettings: taxSettingsSchema.optional(),

  billingSettings: billingSettingsSchema.optional(),

  settings: settingsSchema.optional(),

  status: Joi.string()
    .valid(...Object.values(COMPANY_STATUS))
    .optional(),
});
