/**
 * HsnMaster Service
 *
 * Architecture rules:
 * ──────────────────────────────────────────
 * ✅ HsnMaster is the single source of truth for HSN / SAC codes and GST rates.
 * ✅ Fields stored: code (unique), description, gstRate, isActive.
 * ✅ GlobalProduct references HsnMaster via ObjectId — never inline GST data.
 * ✅ code is immutable after creation — it is the identity of the HSN entry.
 * ❌ Do NOT store pricing (MRP/PTR), inventory, or product-level data here.
 */

import ApiError from "../../../../../utils/ApiError.js";

import hsnMasterRepository from "../repositories/hsnMaster.repository.js";

import { GST_RATE_VALUES } from "../constants/gstRates.constant.js";
import { HSN_MASTER_STATUS } from "../constants/hsnMaster.constant.js";

// ---------------------
// Create
// ---------------------

/**
 * Create a new HSN / SAC master record.
 * - code must be unique across all records.
 * - gstRate must be one of the allowed GST slab values.
 */
const createHsnMaster = async (payload) => {
  const existing = await hsnMasterRepository.findHsnMasterByCode(payload.code);

  if (existing) {
    throw new ApiError(400, `HSN code ${payload.code} already exists`);
  }

  const hsnPayload = {
    code: payload.code,
    description: payload.description || null,
    gstRate: payload.gstRate ?? null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : HSN_MASTER_STATUS.ACTIVE,
  };

  const hsnMaster = await hsnMasterRepository.createHsnMaster(hsnPayload);

  return hsnMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getHsnMasters = async (filters = {}, options = {}) => {
  const { hsnMasters, total, page, limit } =
    await hsnMasterRepository.getHsnMasters(filters, options);

  return {
    hsnMasters: hsnMasters.map((h) => h.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getHsnMasterById = async (hsnId) => {
  const hsnMaster = await hsnMasterRepository.findHsnMasterById(hsnId);

  if (!hsnMaster) {
    throw new ApiError(404, "HSN master record not found");
  }

  return hsnMaster.toSafeObject();
};

const getHsnMasterByCode = async (code) => {
  const hsnMaster = await hsnMasterRepository.findHsnMasterByCode(code);

  if (!hsnMaster) {
    throw new ApiError(404, "HSN master record not found");
  }

  return hsnMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update an HSN master record.
 *
 * Rules:
 * - code is IMMUTABLE — it cannot be changed after creation.
 * - gstRate must remain within the allowed slab values.
 * - description and isActive can be freely updated.
 */
const updateHsnMaster = async (hsnId, payload) => {
  const hsnMaster = await hsnMasterRepository.findHsnMasterById(hsnId);

  if (!hsnMaster) {
    throw new ApiError(404, "HSN master record not found");
  }

  const allowedFields = ["description", "gstRate", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      hsnMaster[field] = payload[field];
    }
  });

  await hsnMasterRepository.saveHsnMaster(hsnMaster);

  return hsnMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete an HSN master record.
 * Use with caution — GlobalProducts referencing this HSN will lose the link.
 */
const deleteHsnMaster = async (hsnId) => {
  const hsnMaster = await hsnMasterRepository.deleteHsnMasterById(hsnId);

  if (!hsnMaster) {
    throw new ApiError(404, "HSN master record not found");
  }

  return { success: true };
};

export default {
  createHsnMaster,
  getHsnMasters,
  getHsnMasterById,
  getHsnMasterByCode,
  updateHsnMaster,
  deleteHsnMaster,
};
