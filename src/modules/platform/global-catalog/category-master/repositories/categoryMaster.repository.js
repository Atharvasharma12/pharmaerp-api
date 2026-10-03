import mongoose from "mongoose";

import CategoryMaster from "../models/categoryMaster.model.js";

// ---------------------
// Finders
// ---------------------

const findCategoryMasterById = async (categoryId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  return CategoryMaster.findById(categoryId).select(options.select || "");
};

const findCategoryMasterByNameAndParent = async (name, parentCategory = null, options = {}) => {
  const query = {
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    parentCategory: parentCategory || null,
  };
  return CategoryMaster.findOne(query).select(options.select || "");
};

const findCategoryMasterBySlug = async (slug, options = {}) => {
  return CategoryMaster.findOne({ slug: slug.trim().toLowerCase() }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of Category master records.
 *
 * Supported filters:
 *   isActive        — true | false
 *   parentCategory  — null | string (id)
 *   level           — number
 *   search          — full-text search against name, slug, and description
 */
const getCategoryMasters = async (filters = {}, options = {}) => {
  const query = {};

  if (filters.isActive !== undefined && filters.isActive !== null) {
    query.isActive = filters.isActive;
  }

  if (filters.parentCategory !== undefined) {
    query.parentCategory = filters.parentCategory || null;
  }

  if (filters.level !== undefined && filters.level !== null) {
    query.level = Number(filters.level);
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

  const [categoryMasters, total] = await Promise.all([
    CategoryMaster.find(query, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("parentCategory", "name slug")
      .select(options.select || ""),
    CategoryMaster.countDocuments(query),
  ]);

  return { categoryMasters, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createCategoryMaster = async (payload) => {
  return CategoryMaster.create(payload);
};

const saveCategoryMaster = async (categoryMaster) => {
  return categoryMaster.save();
};

const deleteCategoryMasterById = async (categoryId) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  return CategoryMaster.findByIdAndDelete(categoryId);
};

export default {
  findCategoryMasterById,
  findCategoryMasterByNameAndParent,
  findCategoryMasterBySlug,
  getCategoryMasters,
  createCategoryMaster,
  saveCategoryMaster,
  deleteCategoryMasterById,
};
