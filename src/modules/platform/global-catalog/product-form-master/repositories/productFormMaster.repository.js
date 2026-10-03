import mongoose from "mongoose";

import ProductFormMaster from "../models/productFormMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findProductFormMasterById = async (formId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(formId)) {
    return null;
  }

  return ProductFormMaster.findById(formId).select(options.select || "");
};

const findProductFormMasterByName = async (name, options = {}) => {
  // Case-insensitive exact name lookup
  return ProductFormMaster.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of Product Form master records.
 *
 * Supported filters:
 *   isActive  — true | false
 *   search    — full-text search against name and description
 */
const getProductFormMasters = async (filters = {}, options = {}) => {
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

  const [productFormMasters, total] = await Promise.all([
    ProductFormMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    ProductFormMaster.countDocuments(query),
  ]);

  return { productFormMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createProductFormMaster = async (payload) => {
  return ProductFormMaster.create(payload);
};

const saveProductFormMaster = async (productFormMaster) => {
  return productFormMaster.save();
};

const deleteProductFormMasterById = async (formId) => {
  if (!mongoose.Types.ObjectId.isValid(formId)) {
    return null;
  }

  return ProductFormMaster.findByIdAndDelete(formId);
};

export default {
  findProductFormMasterById,
  findProductFormMasterByName,
  getProductFormMasters,
  createProductFormMaster,
  saveProductFormMaster,
  deleteProductFormMasterById,
};
