import ApiError from "../../../../utils/ApiError.js";

import marketplaceStoreRepository from "../../../marketplace/stores/repositories/marketplaceStore.repository.js";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../../marketplace/stores/constants/marketplaceStore.constant.js";

const getPlatformUserId = (platformUser) =>
  platformUser?._id || platformUser?.id || null;

const STORE_POPULATE = [
  {
    path: "workspaceId",
    select: "name slug status",
  },
  {
    path: "companyId",
    select: "companyName",
  },
  {
    path: "branchId",
    select: "branchName address city state",
  },
];

// List all stores (platform-wide, paginated)
const getAllStores = async (filters = {}) => {
  const { stores, total, page, limit } =
    await marketplaceStoreRepository.getAllStores(
      {
        status: filters.status,
        verificationStatus: filters.verificationStatus,
        onlineStatus: filters.onlineStatus,
        workspaceId: filters.workspaceId,
        search: filters.search,
      },
      {
        page: filters.page,
        limit: filters.limit,
      },
    );

  return {
    stores: stores.map((s) => s.toSafeObject()),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

// Get a single store by ID (any workspace)
const getStoreById = async (storeId) => {
  if (!marketplaceStoreRepository.findStoreById) {
    throw new ApiError(500, "Repository method not found");
  }

  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  return store.toSafeObject();
};

// Platform admin overrides online status of any store
const setOnlineStatus = async (storeId, onlineStatus, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  if (store.status !== MARKETPLACE_STORE_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      "Only ACTIVE stores can have their online status changed",
    );
  }

  store.onlineStatus = onlineStatus;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

// Platform admin force-closes a store (soft delete)
const closeStore = async (storeId, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  await marketplaceStoreRepository.softDeleteStore(
    storeId,
    getPlatformUserId(platformUser),
  );

  return { success: true };
};

// Dashboard stat summary
const getStoreStats = async () => {
  const groups = await marketplaceStoreRepository.countByStatus();

  const stats = {
    total: 0,
    byStatus: {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
      CLOSED: 0,
    },
    byVerification: {
      PENDING: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
    },
    byOnlineStatus: {
      ONLINE: 0,
      OFFLINE: 0,
    },
  };

  groups.forEach(({ _id, count }) => {
    stats.total += count;

    if (_id.status && stats.byStatus[_id.status] !== undefined) {
      stats.byStatus[_id.status] += count;
    }

    if (
      _id.verificationStatus &&
      stats.byVerification[_id.verificationStatus] !== undefined
    ) {
      stats.byVerification[_id.verificationStatus] += count;
    }

    if (_id.onlineStatus && stats.byOnlineStatus[_id.onlineStatus] !== undefined) {
      stats.byOnlineStatus[_id.onlineStatus] += count;
    }
  });

  return stats;
};

export default {
  getAllStores,
  getStoreById,
  setOnlineStatus,
  closeStore,
  getStoreStats,
};
