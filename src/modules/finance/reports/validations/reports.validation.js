import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

// ── Trial Balance ──────────────────────────────────────────────
export const trialBalanceQuerySchema = Joi.object({
  asOfDate: Joi.date().iso().optional(),
  includeZeroBalances: Joi.boolean().default(false).optional(),
});

// ── General Ledger ─────────────────────────────────────────────
export const generalLedgerQuerySchema = Joi.object({
  accountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
  all: Joi.boolean().default(false).optional(),
});

// ── Customer Ledger ────────────────────────────────────────────
export const customerLedgerQuerySchema = Joi.object({
  customerId: objectId.optional(),
  accountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
  all: Joi.boolean().default(false).optional(),
});

// ── Supplier Ledger ────────────────────────────────────────────
export const supplierLedgerQuerySchema = Joi.object({
  supplierId: objectId.optional(),
  accountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
  all: Joi.boolean().default(false).optional(),
});

// ── Cash Book ──────────────────────────────────────────────────
export const cashBookQuerySchema = Joi.object({
  accountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
  all: Joi.boolean().default(false).optional(),
});

// ── Bank Book ──────────────────────────────────────────────────
export const bankBookQuerySchema = Joi.object({
  accountId: objectId.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
  all: Joi.boolean().default(false).optional(),
});

// ── Profit & Loss ──────────────────────────────────────────────
export const profitLossQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

// ── Balance Sheet ──────────────────────────────────────────────
export const balanceSheetQuerySchema = Joi.object({
  asOfDate: Joi.date().iso().optional(),
});

// ── GST Report ─────────────────────────────────────────────────
export const gstReportQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  type: Joi.string().valid("GSTR1", "GSTR2", "SUMMARY").default("SUMMARY").optional(),
});
