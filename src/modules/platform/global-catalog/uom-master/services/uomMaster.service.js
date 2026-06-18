import ApiError from "../../../../../utils/ApiError.js";

import uomMasterRepository from "../repositories/uomMaster.repository.js";
import { UOM_MASTER_STATUS } from "../constants/uomMaster.constant.js";

// ---------------------
// Create
// ---------------------

/**
 * Create a new UOM master record.
 * - name must be unique (case-insensitive) across all records.
 * - abbreviation must be unique (case-insensitive) across all records.
 */
const createUomMaster = async (payload) => {
  // Check unique name
  const existingByName = await uomMasterRepository.findUomMasterByName(payload.name);
  if (existingByName) {
    throw new ApiError(400, `UOM with name "${payload.name.trim()}" already exists`);
  }

  // Check unique abbreviation
  const existingByAbbr = await uomMasterRepository.findUomMasterByAbbreviation(payload.abbreviation);
  if (existingByAbbr) {
    throw new ApiError(400, `UOM with abbreviation "${payload.abbreviation.trim()}" already exists`);
  }

  const uomPayload = {
    name: payload.name.trim(),
    abbreviation: payload.abbreviation.trim().toUpperCase(),
    description: payload.description || null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : UOM_MASTER_STATUS.ACTIVE,
  };

  const uomMaster = await uomMasterRepository.createUomMaster(uomPayload);

  return uomMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getUomMasters = async (filters = {}, options = {}) => {
  const { uomMasters, total, page, limit } =
    await uomMasterRepository.getUomMasters(filters, options);

  return {
    uomMasters: uomMasters.map((u) => u.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getUomMasterById = async (uomId) => {
  const uomMaster = await uomMasterRepository.findUomMasterById(uomId);

  if (!uomMaster) {
    throw new ApiError(404, "UOM master record not found");
  }

  return uomMaster.toSafeObject();
};

const getUomMasterByName = async (name) => {
  const uomMaster = await uomMasterRepository.findUomMasterByName(name);

  if (!uomMaster) {
    throw new ApiError(404, "UOM master record not found");
  }

  return uomMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a UOM master record.
 *
 * Rules:
 * - if name is updated, check uniqueness constraint.
 * - if abbreviation is updated, check uniqueness constraint.
 * - description and isActive can be freely updated.
 */
const updateUomMaster = async (uomId, payload) => {
  const uomMaster = await uomMasterRepository.findUomMasterById(uomId);

  if (!uomMaster) {
    throw new ApiError(404, "UOM master record not found");
  }

  // Validate Name update
  if (payload.name && payload.name.trim().toLowerCase() !== uomMaster.name.toLowerCase()) {
    const existingByName = await uomMasterRepository.findUomMasterByName(payload.name);
    if (existingByName) {
      throw new ApiError(400, `UOM with name "${payload.name.trim()}" already exists`);
    }
    uomMaster.name = payload.name.trim();
  }

  // Validate Abbreviation update
  if (payload.abbreviation && payload.abbreviation.trim().toLowerCase() !== uomMaster.abbreviation.toLowerCase()) {
    const existingByAbbr = await uomMasterRepository.findUomMasterByAbbreviation(payload.abbreviation);
    if (existingByAbbr) {
      throw new ApiError(400, `UOM with abbreviation "${payload.abbreviation.trim()}" already exists`);
    }
    uomMaster.abbreviation = payload.abbreviation.trim().toUpperCase();
  }

  const allowedFields = ["description", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      uomMaster[field] = payload[field];
    }
  });

  await uomMasterRepository.saveUomMaster(uomMaster);

  return uomMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete a UOM master record.
 */
const deleteUomMaster = async (uomId) => {
  const uomMaster = await uomMasterRepository.deleteUomMasterById(uomId);

  if (!uomMaster) {
    throw new ApiError(404, "UOM master record not found");
  }

  return { success: true };
};

export default {
  createUomMaster,
  getUomMasters,
  getUomMasterById,
  getUomMasterByName,
  updateUomMaster,
  deleteUomMaster,
};
