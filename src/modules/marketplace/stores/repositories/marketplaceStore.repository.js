import mongoose from "mongoose";

import MarketplaceStore from "../models/marketplaceStore.model.js";

const findStoreById = async (storeId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return null;
  }

  return MarketplaceStore.findOne({
    _id: storeId,
    isDeleted: false,
  }).select(options.select || "");
};

const findStoreByBranchId = async (branchId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return null;
  }

  return MarketplaceStore.findOne({
    branchId,
    isDeleted: false,
  }).select(options.select || "");
};

const findStoreByWorkspaceAndId = async (workspaceId, storeId, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(storeId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return MarketplaceStore.findOne({
    _id: storeId,
    workspaceId,
    isDeleted: false,
  }).select(options.select || "");
};

const createStore = async (payload) => {
  return MarketplaceStore.create(payload);
};

const saveStore = async (store) => {
  return store.save();
};

const getStoresByWorkspace = async (workspaceId, filters = {}, options = {}) => {
  const query = {
    workspaceId,
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.verificationStatus) {
    query.verificationStatus = filters.verificationStatus;
  }

  if (filters.onlineStatus) {
    query.onlineStatus = filters.onlineStatus;
  }

  if (filters.companyId && mongoose.Types.ObjectId.isValid(filters.companyId)) {
    query.companyId = filters.companyId;
  }

  return MarketplaceStore.find(query)
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const softDeleteStore = async (storeId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(storeId)) {
    return null;
  }

  return MarketplaceStore.findOneAndUpdate(
    {
      _id: storeId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "CLOSED",
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

// ─── Platform-admin scope (cross-workspace) ──────────────────────────────────

const getAllStores = async (filters = {}, options = {}) => {
  const query = { isDeleted: false };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.verificationStatus) {
    query.verificationStatus = filters.verificationStatus;
  }

  if (filters.onlineStatus) {
    query.onlineStatus = filters.onlineStatus;
  }

  if (filters.workspaceId && mongoose.Types.ObjectId.isValid(filters.workspaceId)) {
    query.workspaceId = filters.workspaceId;
  }

  if (filters.search) {
    query.$or = [
      { storeName: { $regex: filters.search, $options: "i" } },
      { storeCode: { $regex: filters.search, $options: "i" } },
    ];
  }

  if (filters.isPlatformOwned !== undefined) {
    query.isPlatformOwned =
      filters.isPlatformOwned === "true" || filters.isPlatformOwned === true;
  }

  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;

  const [stores, total] = await Promise.all([
    MarketplaceStore.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("companyId", "name companyName legalName email phone phones owner code companyCode")
      .populate("branchId", "branchName branchCode address phone email")
      .populate("createdBy", "name email phone")
      .populate("workspaceId", "name slug workspaceCode")
      .select(options.select || ""),
    MarketplaceStore.countDocuments(query),
  ]);

  return { stores, total, page, limit };
};

const countByStatus = async () => {
  return MarketplaceStore.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: {
          status: "$status",
          verificationStatus: "$verificationStatus",
          onlineStatus: "$onlineStatus",
          isPlatformOwned: "$isPlatformOwned",
        },
        count: { $sum: 1 },
      },
    },
  ]);
};

export default {
  findStoreById,
  findStoreByBranchId,
  findStoreByWorkspaceAndId,
  createStore,
  saveStore,
  getStoresByWorkspace,
  softDeleteStore,
  // platform-admin
  getAllStores,
  countByStatus,
};
