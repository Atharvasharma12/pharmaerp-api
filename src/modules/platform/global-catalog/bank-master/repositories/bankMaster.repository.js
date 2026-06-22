import mongoose from "mongoose";

import BankMaster from "../models/bankMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findBankMasterById = async (bankId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(bankId)) {
    return null;
  }

  return BankMaster.findById(bankId).select(options.select || "");
};

const findBankMasterByName = async (name, options = {}) => {
  return BankMaster.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

const getBankMasters = async (filters = {}, options = {}) => {
  const query = {};

  if (filters.isActive !== undefined && filters.isActive !== null) {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const sort = filters.search
    ? { score: { $meta: "textScore" }, name: 1 }
    : options.sort || { name: 1 };

  const projection = filters.search ? { score: { $meta: "textScore" } } : {};

  const [bankMasters, total] = await Promise.all([
    BankMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    BankMaster.countDocuments(query),
  ]);

  return { bankMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createBankMaster = async (payload) => {
  return BankMaster.create(payload);
};

const saveBankMaster = async (bankMaster) => {
  return bankMaster.save();
};

const deleteBankMasterById = async (bankId) => {
  if (!mongoose.Types.ObjectId.isValid(bankId)) {
    return null;
  }

  return BankMaster.findByIdAndDelete(bankId);
};

export default {
  findBankMasterById,
  findBankMasterByName,
  getBankMasters,
  createBankMaster,
  saveBankMaster,
  deleteBankMasterById,
};
