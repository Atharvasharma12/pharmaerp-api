import Joi from "joi";

import { BRANCH_STATUS, BRANCH_TYPE } from "../constants/branch.constant.js";

const phoneSchema = Joi.object({
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number",
    }),

  whatsapp: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid WhatsApp number",
    }),

  landline: Joi.string().trim().max(30).allow(null, "").optional(),
});

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

export const createBranchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),

  type: Joi.string()
    .valid(...Object.values(BRANCH_TYPE))
    .optional(),

  isPrimary: Joi.boolean().optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phones: phoneSchema.optional(),

  address: addressSchema.optional(),

  license: licenseSchema.optional(),

  pharmacist: pharmacistSchema.optional(),

  emergencyContact: emergencyContactSchema.optional(),
});

export const updateBranchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).optional(),

  type: Joi.string()
    .valid(...Object.values(BRANCH_TYPE))
    .optional(),

  isPrimary: Joi.boolean().optional(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),

  phones: phoneSchema.allow(null).optional(),

  address: addressSchema.allow(null).optional(),

  license: licenseSchema.allow(null).optional(),

  pharmacist: pharmacistSchema.allow(null).optional(),

  emergencyContact: emergencyContactSchema.allow(null).optional(),

  status: Joi.string()
    .valid(...Object.values(BRANCH_STATUS))
    .optional(),
});
