import mongoose from "mongoose";

import PlatformStoreVerification from "../models/platformStoreVerification.model.js";

import { STORE_VERIFICATION_STATUS } from "../constants/platformStoreVerification.constant.js";

const findByMarketplaceStoreId = async (marketplaceStoreId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(marketplaceStoreId)) {
    return null;
  }

  return PlatformStoreVerification.findOne({
    marketplaceStoreId,
    isDeleted: false,
  }).select(options.select || "");
};

const findById = async (verificationId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(verificationId)) {
    return null;
  }

  return PlatformStoreVerification.findOne({
    _id: verificationId,
    isDeleted: false,
  }).select(options.select || "");
};

const createVerification = async (payload) => {
  return PlatformStoreVerification.create(payload);
};

const saveVerification = async (verification) => {
  return verification.save();
};

const getAllVerifications = async (filters = {}, options = {}) => {
  const query = { isDeleted: false };

  if (filters.verificationStatus) {
    query.verificationStatus = filters.verificationStatus;
  }

  if (
    filters.workspaceId &&
    mongoose.Types.ObjectId.isValid(filters.workspaceId)
  ) {
    query.workspaceId = filters.workspaceId;
  }

  return PlatformStoreVerification.find(query)
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "")
    .populate(
      options.populate || [
        {
          path: "marketplaceStoreId",
          select: "storeCode storeName onlineStatus status",
        },
      ],
    );
};

const countByStatus = async () => {
  return PlatformStoreVerification.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
  ]);
};

export default {
  findByMarketplaceStoreId,
  findById,
  createVerification,
  saveVerification,
  getAllVerifications,
  countByStatus,
};
