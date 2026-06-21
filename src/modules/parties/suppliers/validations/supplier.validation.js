import Joi from "joi";

import {
  SUPPLIER_STATUS,
  SUPPLIER_TYPE,
  SUPPLIER_OPENING_BALANCE_TYPE,
} from "../constants/supplier.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().max(200).allow(null, "").optional(),
  addressLine2: Joi.string().trim().max(200).allow(null, "").optional(),
  city: Joi.string().trim().max(100).allow(null, "").optional(),
  district: Joi.string().trim().max(100).allow(null, "").optional(),
  state: Joi.string().trim().max(100).allow(null, "").optional(),
  country: Joi.string().trim().max(100).allow(null, "").optional(),
  pincode: Joi.string().trim().max(20).allow(null, "").optional(),
});

export const createSupplierSchema = Joi.object({
  branchId: objectId.allow(null).optional(),
  supplierCode: Joi.string().trim().uppercase().max(50).optional(),
  supplierType: Joi.string()
    .valid(...Object.values(SUPPLIER_TYPE))
    .optional(),
  businessName: Joi.string().trim().min(2).max(200).required(),
  contactPerson: Joi.string().trim().max(120).allow(null, "").optional(),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number",
    }),
  alternateMobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid alternate mobile number",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),
  gstNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GST Number",
    }),
  panNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid PAN Number",
    }),
  drugLicenseNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  address: addressSchema.optional(),
  creditDays: Joi.number().integer().min(0).optional(),
  openingBalance: Joi.number().min(0).optional(),
  openingBalanceType: Joi.string()
    .valid(...Object.values(SUPPLIER_OPENING_BALANCE_TYPE))
    .optional(),
  notes: Joi.string().trim().max(1000).allow(null, "").optional(),
});

export const updateSupplierSchema = Joi.object({
  branchId: objectId.allow(null).optional(),
  supplierCode: Joi.string().trim().uppercase().max(50).optional(),
  supplierType: Joi.string()
    .valid(...Object.values(SUPPLIER_TYPE))
    .optional(),
  businessName: Joi.string().trim().min(2).max(200).optional(),
  contactPerson: Joi.string().trim().max(120).allow(null, "").optional(),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number",
    }),
  alternateMobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid alternate mobile number",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),
  gstNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid GST Number",
    }),
  panNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid PAN Number",
    }),
  drugLicenseNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  address: addressSchema.optional(),
  creditDays: Joi.number().integer().min(0).optional(),
  openingBalance: Joi.number().min(0).optional(),
  openingBalanceType: Joi.string()
    .valid(...Object.values(SUPPLIER_OPENING_BALANCE_TYPE))
    .optional(),
  notes: Joi.string().trim().max(1000).allow(null, "").optional(),
  status: Joi.string()
    .valid(...Object.values(SUPPLIER_STATUS))
    .optional(),
}).min(1);

export const supplierIdParamSchema = Joi.object({
  supplierId: objectId.required(),
});

export const getSuppliersQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  businessName: Joi.string().trim().optional(),
  mobile: Joi.string().trim().optional(),
  gstNumber: Joi.string().trim().optional(),
  supplierCode: Joi.string().trim().optional(),
  status: Joi.string()
    .valid(...Object.values(SUPPLIER_STATUS))
    .optional(),
  supplierType: Joi.string()
    .valid(...Object.values(SUPPLIER_TYPE))
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
