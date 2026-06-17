import mongoose from "mongoose";

import GlobalProduct from "../models/globalProduct.model.js";

import { GLOBAL_PRODUCT_STATUS } from "../constants/globalProduct.constant.js";

// ---------------------
// Finders
// ---------------------

const findGlobalProductById = async (productId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  return GlobalProduct.findOne({
    _id: productId,
    isDeleted: false,
  })
    .populate("HsnMaster", "code description gstRate isActive")
    .select(options.select || "");
};

const findGlobalProductByCode = async (globalProductCode, options = {}) => {
  return GlobalProduct.findOne({
    globalProductCode: String(globalProductCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .populate("HsnMaster", "code description gstRate isActive")
    .select(options.select || "");
};

const findGlobalProductByExternalId = async (
  dataSource,
  externalProductId,
  options = {},
) => {
  return GlobalProduct.findOne({
    dataSource,
    externalProductId: String(externalProductId).trim(),
    isDeleted: false,
  }).select(options.select || "");
};

// ---------------------
// List / Search
// ---------------------

/**
 * Paginated list of global products.
 *
 * Supported filters:
 *   status       — active | inactive
 *   productType  — medicine | otc
 *   dataSource   — api | import | manual
 *   search       — full-text search against name, marketer, composition, keyIngredients
 */
const getGlobalProducts = async (filters = {}, options = {}) => {
  const query = {
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.productType) {
    query.productType = filters.productType;
  }

  if (filters.dataSource) {
    query.dataSource = filters.dataSource;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const sort = filters.search
    ? { score: { $meta: "textScore" }, views: -1 }
    : options.sort || { createdAt: -1 };

  const projection = filters.search
    ? { score: { $meta: "textScore" } }
    : {};

  const [products, total] = await Promise.all([
    GlobalProduct.find(query, projection)
      .populate("HsnMaster", "code description gstRate isActive")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    GlobalProduct.countDocuments(query),
  ]);

  return { products, total, page, limit };
};

// ---------------------
// Write Operations
// ---------------------

const createGlobalProduct = async (payload) => {
  return GlobalProduct.create(payload);
};

const saveGlobalProduct = async (product) => {
  return product.save();
};

const softDeleteGlobalProductById = async (
  productId,
  platformUserId = null,
) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  return GlobalProduct.findOneAndUpdate(
    {
      _id: productId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: platformUserId,
      status: GLOBAL_PRODUCT_STATUS.INACTIVE,
      updatedBy: platformUserId,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

/**
 * Atomically increment the view counter for a product.
 * Used by the platform or workspace whenever a product detail is viewed.
 */
const incrementViews = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  return GlobalProduct.findOneAndUpdate(
    { _id: productId, isDeleted: false },
    { $inc: { views: 1 } },
    { new: true },
  );
};

export default {
  findGlobalProductById,
  findGlobalProductByCode,
  findGlobalProductByExternalId,
  getGlobalProducts,
  createGlobalProduct,
  saveGlobalProduct,
  softDeleteGlobalProductById,
  incrementViews,
};
