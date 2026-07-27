import ApiError from "../../../../utils/ApiError.js";

import platformStoreVerificationRepository from "../repositories/platformStoreVerification.repository.js";
import marketplaceStoreRepository from "../../../marketplace/stores/repositories/marketplaceStore.repository.js";

import { STORE_VERIFICATION_STATUS } from "../constants/platformStoreVerification.constant.js";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../../marketplace/stores/constants/marketplaceStore.constant.js";

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

// Helper: resolves both MarketplaceStore and PlatformStoreVerification from either ID
const resolveStoreAndVerification = async (id) => {
  let store = await marketplaceStoreRepository.findStoreById(id);
  let verification;

  if (store) {
    verification =
      await platformStoreVerificationRepository.findByMarketplaceStoreId(id);
  } else {
    verification = await platformStoreVerificationRepository.findById(id);
    if (verification) {
      store = await marketplaceStoreRepository.findStoreById(
        verification.marketplaceStoreId,
      );
    }
  }

  return { store, verification };
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

const getVerificationByStoreId = async (id) => {
  const { verification } = await resolveStoreAndVerification(id);

  if (!verification) {
    throw new ApiError(404, "Verification record not found");
  }

  return verification.toSafeObject();
};

const markUnderReview = async (id, platformUser) => {
  const { verification } = await resolveStoreAndVerification(id);

  if (!verification) {
    throw new ApiError(404, "Verification record not found");
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

const approveStore = async (id, payload, platformUser) => {
  const { store, verification } = await resolveStoreAndVerification(id);

  if (!verification) {
    throw new ApiError(404, "Verification record not found");
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

  if (payload?.reviewNotes || payload?.remarks) {
    verification.reviewNotes = payload.reviewNotes || payload.remarks;
  }

  await platformStoreVerificationRepository.saveVerification(verification);

  // Update marketplace store if it exists
  if (store) {
    store.verificationStatus = MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED;
    store.status = MARKETPLACE_STORE_STATUS.ACTIVE;
    store.approvedBy = platformUserId;
    store.approvedAt = now;
    store.rejectionReason = null;

    await marketplaceStoreRepository.saveStore(store);
  }

  return verification.toSafeObject();
};

const rejectStore = async (id, payload, platformUser) => {
  const { store, verification } = await resolveStoreAndVerification(id);

  if (!verification) {
    throw new ApiError(404, "Verification record not found");
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
  verification.rejectionReason = payload?.rejectionReason || "Non-compliant";
  verification.rejectedBy = platformUserId;
  verification.rejectedAt = now;
  verification.reviewedBy = platformUserId;
  verification.reviewedAt = now;

  if (payload?.reviewNotes || payload?.remarks) {
    verification.reviewNotes = payload.reviewNotes || payload.remarks;
  }

  await platformStoreVerificationRepository.saveVerification(verification);

  // Update marketplace store if it exists
  if (store) {
    store.verificationStatus = MARKETPLACE_STORE_VERIFICATION_STATUS.REJECTED;
    store.status = MARKETPLACE_STORE_STATUS.INACTIVE;
    store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE;
    store.rejectedBy = platformUserId;
    store.rejectedAt = now;
    store.rejectionReason = payload?.rejectionReason;

    await marketplaceStoreRepository.saveStore(store);
  }

  return verification.toSafeObject();
};

const suspendStore = async (id, payload, platformUser) => {
  const { store, verification } = await resolveStoreAndVerification(id);

  const platformUserId = getPlatformUserId(platformUser);
  const now = new Date();

  if (verification) {
    verification.verificationStatus = STORE_VERIFICATION_STATUS.SUSPENDED;
    await platformStoreVerificationRepository.saveVerification(verification);
  }

  if (store) {
    store.status = MARKETPLACE_STORE_STATUS.SUSPENDED;
    store.onlineStatus = MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE;
    store.suspendedBy = platformUserId;
    store.suspendedAt = now;
    store.suspensionReason = payload?.suspensionReason || payload?.reason;

    await marketplaceStoreRepository.saveStore(store);
    return store.toSafeObject();
  }

  if (verification) {
    return verification.toSafeObject();
  }

  throw new ApiError(404, "Marketplace store not found");
};

const unsuspendStore = async (id, platformUser) => {
  const { store, verification } = await resolveStoreAndVerification(id);

  if (verification) {
    verification.verificationStatus = STORE_VERIFICATION_STATUS.APPROVED;
    await platformStoreVerificationRepository.saveVerification(verification);
  }

  if (store) {
    store.status = MARKETPLACE_STORE_STATUS.ACTIVE;
    store.suspensionReason = null;
    await marketplaceStoreRepository.saveStore(store);
    return store.toSafeObject();
  }

  if (verification) {
    return verification.toSafeObject();
  }

  throw new ApiError(404, "Marketplace store not found");
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
