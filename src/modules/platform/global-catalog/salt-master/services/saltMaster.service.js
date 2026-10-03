import ApiError from "../../../../../utils/ApiError.js";

import saltMasterRepository from "../repositories/saltMaster.repository.js";
import { SALT_MASTER_STATUS } from "../constants/saltMaster.constant.js";

// ---------------------
// Create
// ---------------------

/**
 * Create a new Salt master record.
 * - name must be unique (case-insensitive) across all records.
 */
const createSaltMaster = async (payload) => {
  const existing = await saltMasterRepository.findSaltMasterByName(payload.name);

  if (existing) {
    throw new ApiError(400, `Salt with name "${payload.name.trim()}" already exists`);
  }

  const saltPayload = {
    name: payload.name.trim(),
    description: payload.description || null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : SALT_MASTER_STATUS.ACTIVE,
  };

  const saltMaster = await saltMasterRepository.createSaltMaster(saltPayload);

  return saltMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getSaltMasters = async (filters = {}, options = {}) => {
  const { saltMasters, total, page, limit } =
    await saltMasterRepository.getSaltMasters(filters, options);

  return {
    saltMasters: saltMasters.map((s) => s.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getSaltMasterById = async (saltId) => {
  const saltMaster = await saltMasterRepository.findSaltMasterById(saltId);

  if (!saltMaster) {
    throw new ApiError(404, "Salt master record not found");
  }

  return saltMaster.toSafeObject();
};

const getSaltMasterByName = async (name) => {
  const saltMaster = await saltMasterRepository.findSaltMasterByName(name);

  if (!saltMaster) {
    throw new ApiError(404, "Salt master record not found");
  }

  return saltMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Salt master record.
 *
 * Rules:
 * - if name is updated, check uniqueness constraint.
 * - description and isActive can be freely updated.
 */
const updateSaltMaster = async (saltId, payload) => {
  const saltMaster = await saltMasterRepository.findSaltMasterById(saltId);

  if (!saltMaster) {
    throw new ApiError(404, "Salt master record not found");
  }

  if (payload.name && payload.name.trim().toLowerCase() !== saltMaster.name.toLowerCase()) {
    const existing = await saltMasterRepository.findSaltMasterByName(payload.name);
    if (existing) {
      throw new ApiError(400, `Salt with name "${payload.name.trim()}" already exists`);
    }
    saltMaster.name = payload.name.trim();
  }

  const allowedFields = ["description", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      saltMaster[field] = payload[field];
    }
  });

  await saltMasterRepository.saveSaltMaster(saltMaster);

  return saltMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete a Salt master record.
 */
const deleteSaltMaster = async (saltId) => {
  const saltMaster = await saltMasterRepository.deleteSaltMasterById(saltId);

  if (!saltMaster) {
    throw new ApiError(404, "Salt master record not found");
  }

  return { success: true };
};

export default {
  createSaltMaster,
  getSaltMasters,
  getSaltMasterById,
  getSaltMasterByName,
  updateSaltMaster,
  deleteSaltMaster,
};
