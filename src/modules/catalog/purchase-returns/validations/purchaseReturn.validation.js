import Joi from "joi";
import {
  RETURN_MOTIVE,
  SETTLEMENT_TYPE,
  PURCHASE_RETURN_STATUS,
} from "../constants/purchaseReturn.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id format",
  });

const returnItemSchema = Joi.object({
  productId: objectId.required(),
  productName: Joi.string().trim().allow("").optional(),
  pack: Joi.string().trim().allow("").optional(),
  batchId: objectId.required(),
  batchNo: Joi.string().trim().required(),
  expiry: Joi.string().trim().allow("").optional(),

  purchaseBillId: objectId.allow(null).optional(),
  purchaseBillNo: Joi.string().trim().allow("").optional(),
  purchaseBillDate: Joi.string().trim().allow("").optional(),

  sourceBin: Joi.string()
    .valid("SELLABLE", "SCRAP_EXPIRED", "SCRAP_BROKEN")
    .default("SELLABLE"),

  returnQty: Joi.number().min(1).required(),
  rate: Joi.number().min(0).required(),
  discountPct: Joi.number().min(0).max(100).default(0),
  taxableAmount: Joi.number().min(0).optional(),
  gstPct: Joi.number().min(0).max(100).default(0),
  cgstAmt: Joi.number().min(0).optional(),
  sgstAmt: Joi.number().min(0).optional(),
  igstAmt: Joi.number().min(0).optional(),
  totalGst: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
});

export const createPurchaseReturnSchema = Joi.object({
  branchId: objectId.allow(null).optional(),
  supplierId: objectId.required(),
  returnDate: Joi.date().iso().allow(null, "").optional(),
  returnMotive: Joi.string()
    .valid(...Object.values(RETURN_MOTIVE))
    .default(RETURN_MOTIVE.SELLABLE),
  settlementType: Joi.string()
    .valid(...Object.values(SETTLEMENT_TYPE))
    .default(SETTLEMENT_TYPE.DEBIT_NOTE),
  items: Joi.array().items(returnItemSchema).min(1).required(),
  adjustedPurchaseBillId: objectId.allow(null).optional(),
  reason: Joi.string().trim().allow("").max(500).optional(),
  remarks: Joi.string().trim().allow("").max(500).optional(),
});

export const getPurchaseReturnsQuerySchema = Joi.object({
  supplierId: objectId.optional(),
  branchId: Joi.string().optional(),
  returnMotive: Joi.string().optional(),
  status: Joi.string().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const getEligibleBatchesQuerySchema = Joi.object({
  supplierId: objectId.optional(),
  branchId: Joi.string().optional(),
  sourceBin: Joi.string().valid("ALL", "SELLABLE", "SCRAP", "EXPIRED", "BROKEN").default("ALL"),
  search: Joi.string().trim().allow("").optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

export const purchaseReturnIdParamSchema = Joi.object({
  returnId: objectId.required(),
});

export const cancelPurchaseReturnSchema = Joi.object({
  reason: Joi.string().trim().allow("").max(500).optional(),
});
