import mongoose from "mongoose";

import HsnMaster from "../models/hsnMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findHsnMasterById = async (hsnId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(hsnId)) {
    return null;
  }

  return HsnMaster.findById(hsnId).select(options.select || "");
};

const findHsnMasterByCode = async (code, options = {}) => {
  return HsnMaster.findOne({ code: Number(code) }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of HSN master records.
 *
 * Supported filters:
 *   isActive  — true | false
 *   gstRate   — 0 | 5 | 12 | 18 | 28
 *   search    — full-text search against description
 */
const getHsnMasters = async (filters = {}, options = {}) => {
  const query = {};

  if (filters.isActive !== undefined && filters.isActive !== null) {
    query.isActive = filters.isActive;
  }

  if (filters.gstRate !== undefined && filters.gstRate !== null) {
    query.gstRate = Number(filters.gstRate);
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const sort = filters.search
    ? { score: { $meta: "textScore" }, code: 1 }
    : options.sort || { code: 1 };

  const projection = filters.search ? { score: { $meta: "textScore" } } : {};

  const [hsnMasters, total] = await Promise.all([
    HsnMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    HsnMaster.countDocuments(query),
  ]);

  return { hsnMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createHsnMaster = async (payload) => {
  return HsnMaster.create(payload);
};

const saveHsnMaster = async (hsnMaster) => {
  return hsnMaster.save();
};

const deleteHsnMasterById = async (hsnId) => {
  if (!mongoose.Types.ObjectId.isValid(hsnId)) {
    return null;
  }

  return HsnMaster.findByIdAndDelete(hsnId);
};

export default {
  findHsnMasterById,
  findHsnMasterByCode,
  getHsnMasters,
  createHsnMaster,
  saveHsnMaster,
  deleteHsnMasterById,
};
