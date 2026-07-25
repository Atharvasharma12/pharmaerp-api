import mongoose from "mongoose";

import MarketplaceProduct from "../models/marketplaceProduct.model.js";

const findById = async (productId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  let query = MarketplaceProduct.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (options.populate) {
    query = query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const findByStoreAndGlobalProduct = async (
  marketplaceStoreId,
  globalProductId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(marketplaceStoreId) ||
    !mongoose.Types.ObjectId.isValid(globalProductId)
  ) {
    return null;
  }

  return MarketplaceProduct.findOne({
    marketplaceStoreId,
    globalProductId,
    isDeleted: false,
  }).select(options.select || "");
};

const findByStoreAndId = async (marketplaceStoreId, productId, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(productId) ||
    !mongoose.Types.ObjectId.isValid(marketplaceStoreId)
  ) {
    return null;
  }

  let query = MarketplaceProduct.findOne({
    _id: productId,
    marketplaceStoreId,
    isDeleted: false,
  });

  if (options.populate) {
    query = query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const createProduct = async (payload) => {
  return MarketplaceProduct.create(payload);
};

const saveProduct = async (product) => {
  return product.save();
};

const getProductsByStore = async (marketplaceStoreId, filters = {}, options = {}) => {
  const query = {
    marketplaceStoreId,
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.visibility) {
    query.visibility = filters.visibility;
  }

  if (filters.isFeatured !== undefined) {
    query.isFeatured = filters.isFeatured === "true" || filters.isFeatured === true;
  }

  if (filters.prescriptionRequired) {
    query.prescriptionRequired = filters.prescriptionRequired;
  }

  let dbQuery = MarketplaceProduct.find(query)
    .sort(options.sort || { sortOrder: 1, createdAt: -1 });

  if (options.populate) {
    dbQuery = dbQuery.populate(options.populate);
  }

  return dbQuery.select(options.select || "");
};

const softDeleteProduct = async (productId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  return MarketplaceProduct.findOneAndUpdate(
    { _id: productId, isDeleted: false },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "INACTIVE",
    },
    { new: true, runValidators: true },
  );
};

export default {
  findById,
  findByStoreAndGlobalProduct,
  findByStoreAndId,
  createProduct,
  saveProduct,
  getProductsByStore,
  softDeleteProduct,
};
