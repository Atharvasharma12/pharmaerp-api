import Joi from "joi";

import {
  GLOBAL_PRODUCT_STATUS,
  GLOBAL_PRODUCT_TYPE,
  GLOBAL_PRODUCT_DATA_SOURCE,
} from "../constants/globalProduct.constant.js";

/**
 * Validation schemas for GlobalProduct module.
 *
 * Architecture rules enforced (gpnotes.md):
 * ──────────────────────────────────────────
 * ✅ productType is required on create and drives medicineDetails / otcDetails.
 * ✅ productType is excluded from the update schema (immutable after creation).
 * ✅ medicineDetails conditionally required only when productType === "medicine".
 * ✅ otcDetails conditionally required only when productType === "otc".
 * ❌ Pricing fields (mrp, ptr, pts, purchaseRate, margin) are FORBIDDEN — belong to Batch.
 * ❌ Stock/inventory fields are FORBIDDEN — belong to Inventory.
 * 🔗 HsnMaster is an ObjectId ref — never inline GST rate/description here.
 */

// ---------------------
// Reusable helpers
// ---------------------

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

// ---------------------
// Nested schemas
// ---------------------

const interactionsSchema = Joi.object({
  alcohol: Joi.string().trim().allow(null, "").optional(),
  pregnancy: Joi.string().trim().allow(null, "").optional(),
  lactation: Joi.string().trim().allow(null, "").optional(),
  driving: Joi.string().trim().allow(null, "").optional(),
  kidney: Joi.string().trim().allow(null, "").optional(),
  liver: Joi.string().trim().allow(null, "").optional(),
  general: Joi.string().allow(null, "").optional(),
});

/**
 * Medicine-specific details.
 * Only relevant when productType === "medicine".
 */
const medicineDetailsSchema = Joi.object({
  composition: Joi.string().trim().allow(null, "").optional(),
  medicineType: Joi.string().trim().lowercase().allow(null, "").optional(),
  introduction: Joi.string().allow(null, "").optional(),
  description: Joi.string().allow(null, "").optional(),
  howToUse: Joi.string().allow(null, "").optional(),
  safetyAdvice: Joi.string().allow(null, "").optional(),
  missedDose: Joi.string().allow(null, "").optional(),
  prescriptionRequired: Joi.string().trim().allow(null, "").optional(),
  factBox: Joi.string().allow(null, "").optional(),
  primaryUse: Joi.string().allow(null, "").optional(),
  storage: Joi.string().allow(null, "").optional(),
  commonSideEffect: Joi.string().allow(null, "").optional(),
  interactions: interactionsSchema.optional(),
  howItWorks: Joi.string().allow(null, "").optional(),
  qa: Joi.string().trim().allow(null, "").optional(),
});

/**
 * OTC-specific details.
 * Only relevant when productType === "otc".
 */
const otcDetailsSchema = Joi.object({
  category: Joi.string().trim().allow(null, "").optional(),
  marketingCompany: Joi.string().trim().allow(null, "").optional(),
  type: Joi.string().trim().lowercase().allow(null, "").optional(),
  productHighlights: Joi.string().allow(null, "").optional(),
  information: Joi.string().allow(null, "").optional(),
  keyIngredients: Joi.string().allow(null, "").optional(),
  keyBenefits: Joi.string().allow(null, "").optional(),
  directionsForUse: Joi.string().allow(null, "").optional(),
  safetyInformation: Joi.string().allow(null, "").optional(),
});

// ---------------------
// Create schema
// ---------------------

export const createGlobalProductSchema = Joi.object({
  // productType is required and drives conditional detail blocks
  productType: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_TYPE))
    .required(),

  name: Joi.string().trim().min(1).max(300).required(),

  marketer: Joi.string().trim().max(300).allow(null, "").optional(),

  packagingDetail: Joi.string().trim().allow(null, "").optional(),

  pack: Joi.string().trim().allow(null, "").optional(),

  qty: Joi.string().trim().allow(null, "").optional(),

  productForm: Joi.string().trim().allow(null, "").optional(),

  manufacturerAddress: Joi.string().allow(null, "").optional(),

  countryOfOrigin: Joi.string().trim().allow(null, "").optional(),

  manufacturerDetails: Joi.string().allow(null, "").optional(),

  marketerDetails: Joi.string().allow(null, "").optional(),

  imageUrl: Joi.string().uri().trim().allow(null, "").optional(),

  // externalProductId — used when dataSource is "api" or "import"
  externalProductId: Joi.string().trim().max(100).allow(null, "").optional(),

  dataSource: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_DATA_SOURCE))
    .optional(),

  status: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_STATUS))
    .optional(),

  // HsnMaster — ObjectId ref to HsnMaster (single source of truth for GST)
  HsnMaster: objectId.allow(null).optional(),

  // Conditionally accept medicineDetails only for "medicine" products
  medicineDetails: Joi.when("productType", {
    is: GLOBAL_PRODUCT_TYPE.MEDICINE,
    then: medicineDetailsSchema.optional(),
    otherwise: Joi.forbidden(),
  }),

  // Conditionally accept otcDetails only for "otc" products
  otcDetails: Joi.when("productType", {
    is: GLOBAL_PRODUCT_TYPE.OTC,
    then: otcDetailsSchema.optional(),
    otherwise: Joi.forbidden(),
  }),
});

// ---------------------
// Update schema
// ---------------------

/**
 * productType is intentionally excluded — it is immutable after creation.
 * medicineDetails / otcDetails are allowed without the conditional since
 * the service enforces the productType check internally.
 */
export const updateGlobalProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(300).optional(),

  marketer: Joi.string().trim().max(300).allow(null, "").optional(),

  packagingDetail: Joi.string().trim().allow(null, "").optional(),

  pack: Joi.string().trim().allow(null, "").optional(),

  qty: Joi.string().trim().allow(null, "").optional(),

  productForm: Joi.string().trim().allow(null, "").optional(),

  manufacturerAddress: Joi.string().allow(null, "").optional(),

  countryOfOrigin: Joi.string().trim().allow(null, "").optional(),

  manufacturerDetails: Joi.string().allow(null, "").optional(),

  marketerDetails: Joi.string().allow(null, "").optional(),

  imageUrl: Joi.string().uri().trim().allow(null, "").optional(),

  status: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_STATUS))
    .optional(),

  HsnMaster: objectId.allow(null).optional(),

  medicineDetails: medicineDetailsSchema.optional(),

  otcDetails: otcDetailsSchema.optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const globalProductIdParamSchema = Joi.object({
  productId: objectId.required(),
});

export const globalProductCodeParamSchema = Joi.object({
  productCode: Joi.string().trim().uppercase().required(),
});

// ---------------------
// Query / list schema
// ---------------------

export const getGlobalProductsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_STATUS))
    .optional(),

  productType: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_TYPE))
    .optional(),

  dataSource: Joi.string()
    .valid(...Object.values(GLOBAL_PRODUCT_DATA_SOURCE))
    .optional(),

  // Full-text search across name, marketer, composition, keyIngredients, category
  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});
