import mongoose from "mongoose";

import PlatformPricing from "../models/platformPricing.model.js";

const findByGlobalProductId = async (globalProductId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(globalProductId)) {
    return null;
  }

  return PlatformPricing.findOne({
    globalProductId,
    isDeleted: false,
  }).select(options.select || "");
};

const findById = async (pricingId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(pricingId)) {
    return null;
  }

  let query = PlatformPricing.findOne({ _id: pricingId, isDeleted: false });

  if (options.populate) {
    query = query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const createPricing = async (payload) => {
  return PlatformPricing.create(payload);
};

const savePricing = async (pricing) => {
  return pricing.save();
};

const getAllPricing = async (filters = {}, options = {}) => {
  const query = { isDeleted: false };

  if (filters.status) {
    query.status = filters.status;
  }

  let dbQuery = PlatformPricing.find(query).sort(
    options.sort || { createdAt: -1 },
  );

  if (options.populate) {
    dbQuery = dbQuery.populate(options.populate);
  }

  return dbQuery.select(options.select || "");
};

// Bulk fetch pricing for a list of globalProductIds (used by marketplace/pricing)
const findManyByGlobalProductIds = async (globalProductIds) => {
  const validIds = globalProductIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );

  if (!validIds.length) return [];

  return PlatformPricing.find({
    globalProductId: { $in: validIds },
    isDeleted: false,
    status: "ACTIVE",
  }).select("globalProductId mrp customerPrice partnerSettlementPrice deliveryCharge status updatedAt");
};

const softDelete = async (pricingId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(pricingId)) {
    return null;
  }

  return PlatformPricing.findOneAndUpdate(
    { _id: pricingId, isDeleted: false },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "INACTIVE",
    },
    { new: true },
  );
};

export default {
  findByGlobalProductId,
  findById,
  createPricing,
  savePricing,
  getAllPricing,
  findManyByGlobalProductIds,
  softDelete,
};
