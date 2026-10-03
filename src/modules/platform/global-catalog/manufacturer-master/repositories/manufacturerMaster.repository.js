import mongoose from "mongoose";

import ManufacturerMaster from "../models/manufacturerMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findManufacturerMasterById = async (manufacturerId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(manufacturerId)) {
    return null;
  }

  return ManufacturerMaster.findById(manufacturerId).select(options.select || "");
};

const findManufacturerMasterByName = async (name, options = {}) => {
  // Case-insensitive exact name lookup
  return ManufacturerMaster.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of Manufacturer master records.
 *
 * Supported filters:
 *   isActive  — true | false
 *   search    — full-text search against name and description
 */
const getManufacturerMasters = async (filters = {}, options = {}) => {
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

  const [manufacturerMasters, total] = await Promise.all([
    ManufacturerMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    ManufacturerMaster.countDocuments(query),
  ]);

  return { manufacturerMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createManufacturerMaster = async (payload) => {
  return ManufacturerMaster.create(payload);
};

const saveManufacturerMaster = async (manufacturerMaster) => {
  return manufacturerMaster.save();
};

const deleteManufacturerMasterById = async (manufacturerId) => {
  if (!mongoose.Types.ObjectId.isValid(manufacturerId)) {
    return null;
  }

  return ManufacturerMaster.findByIdAndDelete(manufacturerId);
};

export default {
  findManufacturerMasterById,
  findManufacturerMasterByName,
  getManufacturerMasters,
  createManufacturerMaster,
  saveManufacturerMaster,
  deleteManufacturerMasterById,
};
