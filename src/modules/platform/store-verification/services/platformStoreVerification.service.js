import ApiError from "../../../../utils/ApiError.js";

import platformStoreVerificationRepository from "../repositories/platformStoreVerification.repository.js";
import marketplaceStoreRepository from "../../../marketplace/stores/repositories/marketplaceStore.repository.js";

import {
  STORE_VERIFICATION_STATUS,
} from "../constants/platformStoreVerification.constant.js";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../../marketplace/stores/constants/marketplaceStore.constant.js";

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

// Called internally when a marketplace store is created
const createVerificationRecord = async (payload) => {
  const existing =
    await platformStoreVerificationRepository.findByMarketplaceStoreId(
      payload.marketplaceStoreId,
    );

  if (existing) {
    return existing;
  }

  return platformStoreVerificationRepository.createVerification({
    workspaceId: payload.workspaceId,
    companyId: payload.companyId,
    branchId: payload.branchId,
    marketplaceStoreId: payload.marketplaceStoreId,
    verificationStatus: STORE_VERIFICATION_STATUS.PENDING,
  });
};

const getAllVerifications = async (filters = {}) => {
  const records =
    await platformStoreVerificationRepository.getAllVerifications(filters);

  return records.map((r) => r.toSafeObject());
};

const getVerificationByStoreId = async (storeId) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  const verification =
    await platformStoreVerificationRepository.findByMarketplaceStoreId(storeId);

  if (!verification) {
    throw new ApiError(404, "Verification record not found for this store");
  }

  return verification.toSafeObject();
};

const markUnderReview = async (storeId, platformUser) => {
  const verification =
    await platformStoreVerificationRepository.findByMarketplaceStoreId(storeId);

  if (!verification) {
    throw new ApiError(404, "Verification record not found for this store");
  }

  if (
    verification.verificationStatus !== STORE_VERIFICATION_STATUS.PENDING
  ) {
    throw new ApiError(
      400,
      "Only PENDING verifications can be moved to UNDER_REVIEW",
    );
  }

  verification.verificationStatus = STORE_VERIFICATION_STATUS.UNDER_REVIEW;
  verification.reviewedBy = getPlatformUserId(platformUser);
  verification.reviewedAt = new Date();

  await platformStoreVerificationRepository.saveVerification(verification);

  return verification.toSafeObject();
};

const approveStore = async (storeId, payload, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  const verification =
    await platformStoreVerificationRepository.findByMarketplaceStoreId(storeId);

  if (!verification) {
    throw new ApiError(404, "Verification record not found for this store");
  }

  if (
    verification.verificationStatus === STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(400, "Store is already approved");
  }

  const platformUserId = getPlatformUserId(platformUser);
  const now = new Date();

  // Update verification record
  verification.verificationStatus = STORE_VERIFICATION_STATUS.APPROVED;
  verification.approvedBy = platformUserId;
  verification.approvedAt = now;
  verification.reviewedBy = platformUserId;
  verification.reviewedAt = now;

  if (payload?.reviewNotes) {
    verification.reviewNotes = payload.reviewNotes;
  }

  await platformStoreVerificationRepository.saveVerification(verification);

  // Update marketplace store
  store.verificationStatus = MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED;
  store.status = MARKETPLACE_STORE_STATUS.ACTIVE;
  store.approvedBy = platformUserId;
  store.approvedAt = now;
  store.rejectionReason = null;

  await marketplaceStoreRepository.saveStore(store);

  return verification.toSafeObject();
};

const rejectStore = async (storeId, payload, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  const verification =
    await platformStoreVerificationRepository.findByMarketplaceStoreId(storeId);

  if (!verification) {
    throw new ApiError(404, "Verification record not found for this store");
  }

  if (
    verification.verificationStatus === STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(
      400,
      "Cannot reject an already approved store. Use suspend instead.",
    );
  }

  const platformUserId = getPlatformUserId(platformUser);
  const now = new Date();

  // Update verification record
  verification.verificationStatus = STORE_VERIFICATION_STATUS.REJECTED;
  verification.rejectionReason = payload.rejectionReason;
  verification.rejectedBy = platformUserId;
  verification.rejectedAt = now;
  verification.reviewedBy = platformUserId;
  verification.reviewedAt = now;

  if (payload?.reviewNotes) {
    verification.reviewNotes = payload.reviewNotes;
  }

  await platformStoreVerificationRepository.saveVerification(verification);

  // Update marketplace store
  store.verificationStatus = MARKETPLACE_STORE_VERIFICATION_STATUS.REJECTED;
  store.status = MARKETPLACE_STORE_STATUS.INACTIVE;
  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE;
  store.rejectedBy = platformUserId;
  store.rejectedAt = now;
  store.rejectionReason = payload.rejectionReason;

  await marketplaceStoreRepository.saveStore(store);

  return verification.toSafeObject();
};

const suspendStore = async (storeId, payload, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  if (store.status === MARKETPLACE_STORE_STATUS.SUSPENDED) {
    throw new ApiError(400, "Store is already suspended");
  }

  const platformUserId = getPlatformUserId(platformUser);
  const now = new Date();

  store.status = MARKETPLACE_STORE_STATUS.SUSPENDED;
  store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE;
  store.suspendedBy = platformUserId;
  store.suspendedAt = now;
  store.suspensionReason = payload.suspensionReason;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const unsuspendStore = async (storeId, platformUser) => {
  const store = await marketplaceStoreRepository.findStoreById(storeId);

  if (!store) {
    throw new ApiError(404, "Marketplace store not found");
  }

  if (store.status !== MARKETPLACE_STORE_STATUS.SUSPENDED) {
    throw new ApiError(400, "Store is not suspended");
  }

  store.status = MARKETPLACE_STORE_STATUS.ACTIVE;
  store.suspensionReason = null;

  await marketplaceStoreRepository.saveStore(store);

  return store.toSafeObject();
};

const getVerificationStats = async () => {
  const counts =
    await platformStoreVerificationRepository.countByStatus();

  const stats = {
    PENDING: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  };

  counts.forEach(({ _id, count }) => {
    if (stats[_id] !== undefined) {
      stats[_id] = count;
    }
  });

  return stats;
};

export default {
  createVerificationRecord,
  getAllVerifications,
  getVerificationByStoreId,
  markUnderReview,
  approveStore,
  rejectStore,
  suspendStore,
  unsuspendStore,
  getVerificationStats,
};
