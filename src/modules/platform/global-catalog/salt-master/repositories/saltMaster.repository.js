import mongoose from "mongoose";

import SaltMaster from "../models/saltMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findSaltMasterById = async (saltId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(saltId)) {
    return null;
  }

  return SaltMaster.findById(saltId).select(options.select || "");
};

const findSaltMasterByName = async (name, options = {}) => {
  // Case-insensitive exact name lookup
  return SaltMaster.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of Salt master records.
 *
 * Supported filters:
 *   isActive  — true | false
 *   search    — full-text search against name and description
 */
const getSaltMasters = async (filters = {}, options = {}) => {
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

  const [saltMasters, total] = await Promise.all([
    SaltMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    SaltMaster.countDocuments(query),
  ]);

  return { saltMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createSaltMaster = async (payload) => {
  return SaltMaster.create(payload);
};

const saveSaltMaster = async (saltMaster) => {
  return saltMaster.save();
};

const deleteSaltMasterById = async (saltId) => {
  if (!mongoose.Types.ObjectId.isValid(saltId)) {
    return null;
  }

  return SaltMaster.findByIdAndDelete(saltId);
};

export default {
  findSaltMasterById,
  findSaltMasterByName,
  getSaltMasters,
  createSaltMaster,
  saveSaltMaster,
  deleteSaltMasterById,
};
