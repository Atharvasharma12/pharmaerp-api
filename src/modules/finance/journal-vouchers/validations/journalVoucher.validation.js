import Joi from "joi";
import {
  JOURNAL_VOUCHER_TYPE,
  JOURNAL_VOUCHER_STATUS,
} from "../constants/journalVoucher.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const lineItemSchema = Joi.object({
  accountId: objectId.required(),
  debit: Joi.number().min(0).default(0).optional(),
  credit: Joi.number().min(0).default(0).optional(),
  narration: Joi.string().trim().max(250).allow(null, "").optional(),
});

export const createVoucherSchema = Joi.object({
  voucherDate: Joi.date().iso().required(),
  voucherType: Joi.string()
    .valid(...Object.values(JOURNAL_VOUCHER_TYPE))
    .required(),
  referenceNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
  status: Joi.string()
    .valid(JOURNAL_VOUCHER_STATUS.DRAFT, JOURNAL_VOUCHER_STATUS.POSTED)
    .default(JOURNAL_VOUCHER_STATUS.DRAFT)
    .optional(),
  lines: Joi.array().items(lineItemSchema).min(2).required(),
});

export const updateVoucherSchema = Joi.object({
  voucherDate: Joi.date().iso().optional(),
  referenceNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  narration: Joi.string().trim().max(500).allow(null, "").optional(),
  status: Joi.string()
    .valid(JOURNAL_VOUCHER_STATUS.DRAFT, JOURNAL_VOUCHER_STATUS.POSTED)
    .optional(),
  lines: Joi.array().items(lineItemSchema).min(2).optional(),
}).min(1);

export const voucherIdParamSchema = Joi.object({
  voucherId: objectId.required(),
});

export const getVouchersQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  voucherType: Joi.string()
    .valid(...Object.values(JOURNAL_VOUCHER_TYPE))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(JOURNAL_VOUCHER_STATUS))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
