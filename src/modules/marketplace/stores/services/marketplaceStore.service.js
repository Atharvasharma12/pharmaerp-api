import ApiError from "../../../../utils/ApiError.js";
import marketplaceStoreRepository from "../repositories/marketplaceStore.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import platformStoreVerificationService from "../../../platform/store-verification/services/platformStoreVerification.service.js";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
  MARKETPLACE_STORE_ONBOARDING_STATUS,
} from "../constants/marketplaceStore.constant.js";

const getUserId = (user) => {
  return user?._id || user?.id || null;
};

const createMarketplaceStore = async (payload, user, reqWorkspaceId) => {
  const branchId = payload.branchId || user?.branchId;

  if (!branchId) {
    throw new ApiError(400, "Branch ID is required to create a store");
  }

  const branch = await branchRepository.findBranchById(branchId);
  if (!branch) {
    throw new ApiError(404, "Branch not found");
  }

  const workspaceId =
    reqWorkspaceId || payload.workspaceId || user?.workspaceId || branch.workspaceId;
  const companyId =
    payload.companyId || user?.companyId || branch.companyId;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required to create a store");
  }

  const existing = await marketplaceStoreRepository.findStoreByBranchId(branchId);

  if (existing) {
    throw new ApiError(
      400,
      "A marketplace store already exists for this branch",
    );
  }

  const store = await marketplaceStoreRepository.createStore({
    workspaceId,
    companyId,
    branchId,
    storeName: payload.storeName || branch.name || branch.branchName || "Store",
    workingHours: payload.workingHours,
    verificationStatus: MARKETPLACE_STORE_VERIFICATION_STATUS.PENDING,
    onlineStatus: MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE,
    onboardingStatus: MARKETPLACE_STORE_ONBOARDING_STATUS.IN_PROGRESS,
    status: MARKETPLACE_STORE_STATUS.INACTIVE,
    createdBy: getUserId(user),
  });

  // Auto-create verification record for platform review
  await platformStoreVerificationService.createVerificationRecord({
    workspaceId,
    companyId,
    branchId,
    marketplaceStoreId: store._id,
  });

  return store.toSafeObject();
};

const getMarketplaceStores = async (user, reqWorkspaceId, filters = {}) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  if (!workspaceId) {
    throw new ApiError(400, "Workspace ID is required");
  }

  const stores = await marketplaceStoreRepository.getStoresByWorkspace(
    workspaceId,
    filters,
  );

  return stores.map((s) => s.toSafeObject());
};

const getMarketplaceStoreById = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  return store.toSafeObject();
};

const updateMarketplaceStore = async (
  storeId,
  payload,
  user,
  reqWorkspaceId,
) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  const allowedFields = ["storeName", "workingHours"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      store[field] = payload[field];
    }
  });

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const goOnline = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  if (
    store.verificationStatus !== MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(
      400,
      "Store must be approved before going online",
    );
  }

  if (store.status !== MARKETPLACE_STORE_STATUS.ACTIVE) {
    throw new ApiError(400, "Store is not active");
  }

  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.ONLINE;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const goOffline = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const pauseStore = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.PAUSED;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const resumeStore = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  if (
    store.verificationStatus !== MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(400, "Store must be approved before resuming");
  }

  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.ONLINE;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const deleteMarketplaceStore = async (storeId, user, reqWorkspaceId) => {
  const workspaceId = reqWorkspaceId || user?.workspaceId;

  const store = await marketplaceStoreRepository.findStoreByWorkspaceAndId(
    workspaceId,
    storeId,
  );

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  await marketplaceStoreRepository.softDeleteStore(storeId, getUserId(user));

  return { success: true };
};

export default {
  createMarketplaceStore,
  getMarketplaceStores,
  getMarketplaceStoreById,
  updateMarketplaceStore,
  goOnline,
  goOffline,
  pauseStore,
  resumeStore,
  deleteMarketplaceStore,
};
