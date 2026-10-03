import ApiError from "../../../../../utils/ApiError.js";

import bankMasterRepository from "../repositories/bankMaster.repository.js";
import { BANK_MASTER_STATUS } from "../constants/bankMaster.constant.js";

// ---------------------
// Create
// ---------------------

const createBankMaster = async (payload) => {
  const existing = await bankMasterRepository.findBankMasterByName(payload.name);
  if (existing) {
    throw new ApiError(400, `Bank with name "${payload.name.trim()}" already exists`);
  }

  const bankPayload = {
    name: payload.name.trim(),
    logoUrl: payload.logoUrl ? payload.logoUrl.trim() : null,
    website: payload.website ? payload.website.trim() : null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : BANK_MASTER_STATUS.ACTIVE,
  };

  const bankMaster = await bankMasterRepository.createBankMaster(bankPayload);

  return bankMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getBankMasters = async (filters = {}, options = {}) => {
  const { bankMasters, total, page, limit } =
    await bankMasterRepository.getBankMasters(filters, options);

  return {
    bankMasters: bankMasters.map((b) => b.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getBankMasterById = async (bankId) => {
  const bankMaster = await bankMasterRepository.findBankMasterById(bankId);

  if (!bankMaster) {
    throw new ApiError(404, "Bank master record not found");
  }

  return bankMaster.toSafeObject();
};

const getBankMasterByName = async (name) => {
  const bankMaster = await bankMasterRepository.findBankMasterByName(name);

  if (!bankMaster) {
    throw new ApiError(404, "Bank master record not found");
  }

  return bankMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

const updateBankMaster = async (bankId, payload) => {
  const bankMaster = await bankMasterRepository.findBankMasterById(bankId);

  if (!bankMaster) {
    throw new ApiError(404, "Bank master record not found");
  }

  if (payload.name && payload.name.trim().toLowerCase() !== bankMaster.name.toLowerCase()) {
    const existing = await bankMasterRepository.findBankMasterByName(payload.name);
    if (existing) {
      throw new ApiError(400, `Bank with name "${payload.name.trim()}" already exists`);
    }
    bankMaster.name = payload.name.trim();
  }

  const allowedFields = ["logoUrl", "website", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      bankMaster[field] = typeof payload[field] === "string" ? payload[field].trim() : payload[field];
    }
  });

  await bankMasterRepository.saveBankMaster(bankMaster);

  return bankMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

const deleteBankMaster = async (bankId) => {
  const bankMaster = await bankMasterRepository.deleteBankMasterById(bankId);

  if (!bankMaster) {
    throw new ApiError(404, "Bank master record not found");
  }

  return { success: true };
};

export default {
  createBankMaster,
  getBankMasters,
  getBankMasterById,
  getBankMasterByName,
  updateBankMaster,
  deleteBankMaster,
};
