import Joi from "joi";

import {
  BRANCH_STATUS,
  BRANCH_TYPE,
  BRANCH_INVENTORY_MODE,
  BRANCH_PRICE_MODE,
} from "../constants/branch.constant.js";

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().max(200).allow(null, "").optional(),

  addressLine2: Joi.string().trim().max(200).allow(null, "").optional(),

  city: Joi.string().trim().max(100).allow(null, "").optional(),

  district: Joi.string().trim().max(100).allow(null, "").optional(),

  state: Joi.string().trim().max(100).allow(null, "").optional(),

  country: Joi.string().trim().max(100).allow(null, "").optional(),

  pincode: Joi.string().trim().max(20).allow(null, "").optional(),

  googleMapLocation: Joi.string().trim().max(500).allow(null, "").optional(),
});

const licenseSchema = Joi.object({
  drugLicenseNumber: Joi.string()
    .trim()
    .uppercase()
    .max(100)
    .allow(null, "")
    .optional(),

  drugLicenseType: Joi.string().trim().max(100).allow(null, "").optional(),

  fssaiNumber: Joi.string().trim().max(100).allow(null, "").optional(),

  expiresAt: Joi.date().allow(null).optional(),
});

const pharmacistSchema = Joi.object({
  name: Joi.string().trim().max(120).allow(null, "").optional(),

  registrationNumber: Joi.string()
    .trim()
    .uppercase()
    .max(100)
    .allow(null, "")
    .optional(),

  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid pharmacist mobile number",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),
});

const emergencyContactSchema = Joi.object({
  name: Joi.string().trim().max(120).allow(null, "").optional(),

  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid emergency contact mobile number",
    }),

  relationship: Joi.string().trim().max(100).allow(null, "").optional(),
});

const billingSettingsSchema = Joi.object({
  invoicePrefix: Joi.string().trim().uppercase().max(20).optional(),

  purchasePrefix: Joi.string().trim().uppercase().max(20).optional(),

  salesReturnPrefix: Joi.string().trim().uppercase().max(20).optional(),

  purchaseReturnPrefix: Joi.string().trim().uppercase().max(20).optional(),

  creditNotePrefix: Joi.string().trim().uppercase().max(20).optional(),

  debitNotePrefix: Joi.string().trim().uppercase().max(20).optional(),

  startingInvoiceNumber: Joi.number().integer().min(1).optional(),

  startingPurchaseNumber: Joi.number().integer().min(1).optional(),
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

  enableStockTracking: Joi.boolean().optional(),
});

const workingHoursSchema = Joi.object({
  openingTime: Joi.string().trim().max(20).allow(null, "").optional(),

  closingTime: Joi.string().trim().max(20).allow(null, "").optional(),

  weeklyOff: Joi.string().trim().max(50).allow(null, "").optional(),

  workingDays: Joi.array().items(Joi.string().trim().max(30)).optional(),
});

const facilitiesSchema = Joi.object({
  homeDelivery: Joi.boolean().optional(),

  whatsappOrders: Joi.boolean().optional(),

  onlineOrders: Joi.boolean().optional(),

  coldStorageAvailable: Joi.boolean().optional(),

  twentyFourSevenService: Joi.boolean().optional(),
});

const settingsSchema = Joi.object({
  timezone: Joi.string().trim().max(80).optional(),

  currency: Joi.string().trim().uppercase().length(3).optional(),

  dateFormat: Joi.string().trim().max(30).optional(),

  timeFormat: Joi.string().trim().valid("12h", "24h").optional(),
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

  license: licenseSchema.optional(),

  pharmacist: pharmacistSchema.optional(),

  emergencyContact: emergencyContactSchema.optional(),

  billingSettings: billingSettingsSchema.optional(),

  inventorySettings: inventorySettingsSchema.optional(),

  workingHours: workingHoursSchema.optional(),

  facilities: facilitiesSchema.optional(),

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

  license: licenseSchema.allow(null).optional(),

  pharmacist: pharmacistSchema.allow(null).optional(),

  emergencyContact: emergencyContactSchema.allow(null).optional(),

  billingSettings: billingSettingsSchema.optional(),

  inventorySettings: inventorySettingsSchema.optional(),

  workingHours: workingHoursSchema.allow(null).optional(),

  facilities: facilitiesSchema.optional(),

  settings: settingsSchema.optional(),

  status: Joi.string()
    .valid(...Object.values(BRANCH_STATUS))
    .optional(),

  isPrimary: Joi.boolean().optional(),
});
