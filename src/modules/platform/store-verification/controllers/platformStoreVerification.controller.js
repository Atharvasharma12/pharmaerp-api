import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformStoreVerificationService from "../services/platformStoreVerification.service.js";

export const getAllVerifications = asyncHandler(async (req, res) => {
  const verifications =
    await platformStoreVerificationService.getAllVerifications(req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Store verifications fetched successfully",
        verifications,
      ),
    );
});

export const getVerificationByStoreId = asyncHandler(async (req, res) => {
  const verification =
    await platformStoreVerificationService.getVerificationByStoreId(
      req.params.storeId,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Store verification fetched successfully",
        verification,
      ),
    );
});

export const markUnderReview = asyncHandler(async (req, res) => {
  const verification =
    await platformStoreVerificationService.markUnderReview(
      req.params.storeId,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Store marked as under review", verification),
    );
});

export const approveStore = asyncHandler(async (req, res) => {
  const verification = await platformStoreVerificationService.approveStore(
    req.params.storeId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store approved successfully", verification));
});

export const rejectStore = asyncHandler(async (req, res) => {
  const verification = await platformStoreVerificationService.rejectStore(
    req.params.storeId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store rejected successfully", verification));
});

export const suspendStore = asyncHandler(async (req, res) => {
  const store = await platformStoreVerificationService.suspendStore(
    req.params.storeId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store suspended successfully", store));
});

export const unsuspendStore = asyncHandler(async (req, res) => {
  const store = await platformStoreVerificationService.unsuspendStore(
    req.params.storeId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store unsuspended successfully", store));
});

export const getVerificationStats = asyncHandler(async (req, res) => {
  const stats =
    await platformStoreVerificationService.getVerificationStats();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Verification stats fetched successfully",
        stats,
      ),
    );
});
