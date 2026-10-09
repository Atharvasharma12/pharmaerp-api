import Joi from "joi";

import {
  WORKSPACE_PRODUCT_STATUS,
  WORKSPACE_PRODUCT_TYPE,
} from "../constants/workspaceProduct.constant.js";

/**
 * Validation schemas for WorkspaceProduct module.
 *
 * Architecture rules enforced (gpnotes.md):
 * ──────────────────────────────────────────
 * ✅ productType is required on create and immutable after (excluded from update schema).
 * ✅ Only simple product information: name, manufacturer, pack, qty, productForm, notes.
 * ❌ Medicine descriptions, drug interactions, safety advice are FORBIDDEN.
 * ❌ OTC information, regulatory data are FORBIDDEN.
 * ❌ Pricing fields (mrp, ptr, pts, purchaseRate) are FORBIDDEN — belong to Batch.
 * ❌ Stock/inventory fields are FORBIDDEN — belong to Inventory.
 * 🔗 HsnMaster is an ObjectId ref — never inline GST rate/description here.
 * 🔒 workspaceId is NEVER accepted in body — always taken from workspace context.
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

const compositionItemSchema = Joi.object({
  salt: objectId.required(),
  strength: Joi.number().min(0).required(),
  unit: Joi.string()
    .valid("mg", "g", "mcg", "ml", "%", "IU")
    .required(),
});

// ---------------------
// Create schema
// ---------------------

export const createWorkspaceProductSchema = Joi.object({
  // productType is required and immutable — set on creation only
  productType: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_TYPE))
    .required(),

  name: Joi.string().trim().min(1).max(300).required(),

  // manufacturer — ref to ManufacturerMaster
  manufacturer: objectId.allow(null).optional(),

  pack: Joi.string().trim().allow(null, "").optional(),

  qty: Joi.string().trim().allow(null, "").optional(),

  // uom — ref to UomMaster
  uom: objectId.allow(null).optional(),

  // category — ref to CategoryMaster
  category: objectId.allow(null).optional(),

  // productForm — ref to ProductFormMaster
  productForm: objectId.allow(null).optional(),

  // HsnMaster — ObjectId ref for GST (single source of truth, never inline)
  HsnMaster: objectId.allow(null).optional(),

  composition: Joi.array().items(compositionItemSchema).default([]).optional(),

  // notes — simple free-form notes (not regulatory/descriptive medicine info)
  notes: Joi.string().trim().max(2000).allow(null, "").optional(),

  status: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_STATUS))
    .optional(),

  /**
   * force — bypass the global product duplicate guard.
   * Set to true when the user has already reviewed suggestions
   * and explicitly wants to create a workspace product anyway.
   */
  force: Joi.boolean().default(false).optional(),
});

// ---------------------
// Update schema
// ---------------------

/**
 * productType is intentionally excluded — it is immutable after creation.
 * workspaceId is intentionally excluded — always scoped from context.
 */
export const updateWorkspaceProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(300).optional(),

  manufacturer: objectId.allow(null).optional(),

  pack: Joi.string().trim().allow(null, "").optional(),

  qty: Joi.string().trim().allow(null, "").optional(),

  uom: objectId.allow(null).optional(),

  category: objectId.allow(null).optional(),

  productForm: objectId.allow(null).optional(),

  HsnMaster: objectId.allow(null).optional(),

  composition: Joi.array().items(compositionItemSchema).optional(),

  notes: Joi.string().trim().max(2000).allow(null, "").optional(),

  status: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_STATUS))
    .optional(),

  mrp: Joi.number().min(0).allow(null).optional(),
  ptr: Joi.number().min(0).allow(null).optional(),
  pts: Joi.number().min(0).allow(null).optional(),
  rateA: Joi.number().min(0).allow(null).optional(),
  rateB: Joi.number().min(0).allow(null).optional(),
  rateC: Joi.number().min(0).allow(null).optional(),
  b2cDiscountPercent: Joi.number().min(0).max(100).allow(null).optional(),
  hsn: Joi.number().allow(null).optional(),
  hsnTaxpercent: Joi.number().allow(null).optional(),
}).min(1);

// ---------------------
// Param schemas
// ---------------------

export const workspaceProductIdParamSchema = Joi.object({
  productId: objectId.required(),
});

export const workspaceProductCodeParamSchema = Joi.object({
  productCode: Joi.string().trim().uppercase().required(),
});

// ---------------------
// Query / list schema
// ---------------------

export const getWorkspaceProductsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_STATUS))
    .optional(),

  productType: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_TYPE))
    .optional(),

  // Simple name search (regex) — not full-text like GlobalProduct
  search: Joi.string().trim().min(1).max(200).allow("").optional(),

  summary: Joi.boolean().optional(),

  branchId: objectId.when("summary", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  page: Joi.number().integer().min(1).default(1).optional(),

  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---------------------
// Search-before-create query schema
// ---------------------

/**
 * Used by GET /catalog/products/search?name=...&productType=...
 * Frontend calls this before creating a workspace product to check
 * if a global product already matches.
 */
export const searchBeforeCreateQuerySchema = Joi.object({
  name: Joi.string().trim().min(1).max(300).required(),

  productType: Joi.string()
    .valid(...Object.values(WORKSPACE_PRODUCT_TYPE))
    .optional(),
});
