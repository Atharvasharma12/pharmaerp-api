import mongoose from "mongoose";

import UomMaster from "../models/uomMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findUomMasterById = async (uomId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(uomId)) {
    return null;
  }

  return UomMaster.findById(uomId).select(options.select || "");
};

const findUomMasterByName = async (name, options = {}) => {
  // Case-insensitive exact name lookup
  return UomMaster.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  }).select(options.select || "");
};

const findUomMasterByAbbreviation = async (abbreviation, options = {}) => {
  // Case-insensitive exact abbreviation lookup
  return UomMaster.findOne({
    abbreviation: { $regex: new RegExp(`^${abbreviation.trim()}$`, "i") },
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of UOM master records.
 *
 * Supported filters:
 *   isActive  — true | false
 *   search    — full-text search against name, abbreviation, and description
 */
const getUomMasters = async (filters = {}, options = {}) => {
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

  const [uomMasters, total] = await Promise.all([
    UomMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    UomMaster.countDocuments(query),
  ]);

  return { uomMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createUomMaster = async (payload) => {
  return UomMaster.create(payload);
};

const saveUomMaster = async (uomMaster) => {
  return uomMaster.save();
};

const deleteUomMasterById = async (uomId) => {
  if (!mongoose.Types.ObjectId.isValid(uomId)) {
    return null;
  }

  return UomMaster.findByIdAndDelete(uomId);
};

export default {
  findUomMasterById,
  findUomMasterByName,
  findUomMasterByAbbreviation,
  getUomMasters,
  createUomMaster,
  saveUomMaster,
  deleteUomMasterById,
};
