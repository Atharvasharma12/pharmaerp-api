import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";
import paymentQrService from "../services/paymentQr.service.js";

export const createPaymentQr = asyncHandler(async (req, res) => {
  const paymentQr = await paymentQrService.createPaymentQr(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Payment QR created successfully", paymentQr));
});

export const getPaymentQrs = asyncHandler(async (req, res) => {
  const result = await paymentQrService.getPaymentQrs(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment QRs fetched successfully", result));
});

export const getPaymentQrById = asyncHandler(async (req, res) => {
  const paymentQr = await paymentQrService.getPaymentQrById(
    req.params.paymentQrId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment QR fetched successfully", paymentQr));
});

export const updatePaymentQr = asyncHandler(async (req, res) => {
  const paymentQr = await paymentQrService.updatePaymentQr(
    req.params.paymentQrId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment QR updated successfully", paymentQr));
});

export const deletePaymentQr = asyncHandler(async (req, res) => {
  const result = await paymentQrService.deletePaymentQr(
    req.params.paymentQrId,
    req.companyId,
    req.workspaceId,
    req.user._id,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment QR deleted successfully", result));
});

export const setPrimary = asyncHandler(async (req, res) => {
  const paymentQr = await paymentQrService.setPrimaryPaymentQr(
    req.params.paymentQrId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Payment QR set as primary successfully", paymentQr));
});
