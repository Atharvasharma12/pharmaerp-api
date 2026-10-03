import Joi from "joi";
import { PERIOD_TYPE, PERIOD_STATUS } from "../constants/financialPeriod.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

export const createPeriodSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  periodType: Joi.string()
    .valid(...Object.values(PERIOD_TYPE))
    .default(PERIOD_TYPE.YEAR)
    .optional(),
  periodCode: Joi.string().trim().max(50).allow(null, "").optional(),
  isCurrent: Joi.boolean().default(false).optional(),
  status: Joi.string()
    .valid(...Object.values(PERIOD_STATUS))
    .default(PERIOD_STATUS.OPEN)
    .optional(),
});

export const updatePeriodStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PERIOD_STATUS))
    .required(),
});

export const periodIdParamSchema = Joi.object({
  periodId: objectId.required(),
});

export const getPeriodsQuerySchema = Joi.object({
  periodType: Joi.string()
    .valid(...Object.values(PERIOD_TYPE))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(PERIOD_STATUS))
    .optional(),
  isCurrent: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  all: Joi.boolean().default(false).optional(),
});
