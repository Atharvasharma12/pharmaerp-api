import Joi from "joi";
import { DOCTOR_STATUS } from "../constants/doctor.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id format",
  });

export const createDoctorSchema = Joi.object({
  branchId: objectId.allow(null).optional(),
  doctorCode: Joi.string().trim().uppercase().max(50).optional(),
  name: Joi.string().trim().min(2).max(160).required().messages({
    "string.empty": "Doctor name is required",
    "any.required": "Doctor name is required",
    "string.min": "Doctor name must be at least 2 characters",
    "string.max": "Doctor name cannot exceed 160 characters",
  }),
  hospitalName: Joi.string().trim().max(200).allow(null, "").optional(),
  specialty: Joi.string().trim().max(100).allow(null, "").optional(),
  registrationNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  address: Joi.string().trim().max(500).allow(null, "").optional(),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),
  status: Joi.string()
    .valid(...Object.values(DOCTOR_STATUS))
    .optional(),
});

export const updateDoctorSchema = Joi.object({
  branchId: objectId.allow(null).optional(),
  name: Joi.string().trim().min(2).max(160).optional(),
  hospitalName: Joi.string().trim().max(200).allow(null, "").optional(),
  specialty: Joi.string().trim().max(100).allow(null, "").optional(),
  registrationNumber: Joi.string().trim().max(100).allow(null, "").optional(),
  address: Joi.string().trim().max(500).allow(null, "").optional(),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9][0-9]{9}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Invalid mobile number",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(200)
    .allow(null, "")
    .optional(),
  status: Joi.string()
    .valid(...Object.values(DOCTOR_STATUS))
    .optional(),
});

export const doctorIdParamSchema = Joi.object({
  doctorId: objectId.required().messages({
    "any.required": "Doctor ID is required",
  }),
});

export const getDoctorsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  specialty: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...Object.values(DOCTOR_STATUS), "all")
    .optional(),
  sort: Joi.string().trim().optional(),
});
