import ApiError from "../../../../../utils/ApiError.js";

import manufacturerMasterRepository from "../repositories/manufacturerMaster.repository.js";
import { MANUFACTURER_MASTER_STATUS } from "../constants/manufacturerMaster.constant.js";

// ---------------------
// Create
// ---------------------

/**
 * Create a new Manufacturer master record.
 * - name must be unique (case-insensitive) across all records.
 */
const createManufacturerMaster = async (payload) => {
  const existing = await manufacturerMasterRepository.findManufacturerMasterByName(payload.name);

  if (existing) {
    throw new ApiError(400, `Manufacturer with name "${payload.name.trim()}" already exists`);
  }

  const manufacturerPayload = {
    name: payload.name.trim(),
    description: payload.description || null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : MANUFACTURER_MASTER_STATUS.ACTIVE,
  };

  const manufacturerMaster = await manufacturerMasterRepository.createManufacturerMaster(manufacturerPayload);

  return manufacturerMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getManufacturerMasters = async (filters = {}, options = {}) => {
  const { manufacturerMasters, total, page, limit } =
    await manufacturerMasterRepository.getManufacturerMasters(filters, options);

  return {
    manufacturerMasters: manufacturerMasters.map((m) => m.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getManufacturerMasterById = async (manufacturerId) => {
  const manufacturerMaster = await manufacturerMasterRepository.findManufacturerMasterById(manufacturerId);

  if (!manufacturerMaster) {
    throw new ApiError(404, "Manufacturer master record not found");
  }

  return manufacturerMaster.toSafeObject();
};

const getManufacturerMasterByName = async (name) => {
  const manufacturerMaster = await manufacturerMasterRepository.findManufacturerMasterByName(name);

  if (!manufacturerMaster) {
    throw new ApiError(404, "Manufacturer master record not found");
  }

  return manufacturerMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Manufacturer master record.
 *
 * Rules:
 * - if name is updated, check uniqueness constraint.
 * - description and isActive can be freely updated.
 */
const updateManufacturerMaster = async (manufacturerId, payload) => {
  const manufacturerMaster = await manufacturerMasterRepository.findManufacturerMasterById(manufacturerId);

  if (!manufacturerMaster) {
    throw new ApiError(404, "Manufacturer master record not found");
  }

  if (payload.name && payload.name.trim().toLowerCase() !== manufacturerMaster.name.toLowerCase()) {
    const existing = await manufacturerMasterRepository.findManufacturerMasterByName(payload.name);
    if (existing) {
      throw new ApiError(400, `Manufacturer with name "${payload.name.trim()}" already exists`);
    }
    manufacturerMaster.name = payload.name.trim();
  }

  const allowedFields = ["description", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      manufacturerMaster[field] = payload[field];
    }
  });

  await manufacturerMasterRepository.saveManufacturerMaster(manufacturerMaster);

  return manufacturerMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete a Manufacturer master record.
 */
const deleteManufacturerMaster = async (manufacturerId) => {
  const manufacturerMaster = await manufacturerMasterRepository.deleteManufacturerMasterById(manufacturerId);

  if (!manufacturerMaster) {
    throw new ApiError(404, "Manufacturer master record not found");
  }

  return { success: true };
};

export default {
  createManufacturerMaster,
  getManufacturerMasters,
  getManufacturerMasterById,
  getManufacturerMasterByName,
  updateManufacturerMaster,
  deleteManufacturerMaster,
};
