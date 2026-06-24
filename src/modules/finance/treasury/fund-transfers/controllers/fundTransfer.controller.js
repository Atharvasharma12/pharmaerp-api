import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";
import fundTransferService from "../services/fundTransfer.service.js";

export const createFundTransfer = asyncHandler(async (req, res) => {
  const fundTransfer = await fundTransferService.createFundTransfer(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(
      new ApiResponse(201, "Fund Transfer created and posted successfully", fundTransfer),
    );
});

export const getFundTransfers = asyncHandler(async (req, res) => {
  const result = await fundTransferService.getFundTransfers(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Fund Transfers fetched successfully", result));
});

export const getFundTransferById = asyncHandler(async (req, res) => {
  const fundTransfer = await fundTransferService.getFundTransferById(
    req.params.fundTransferId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Fund Transfer fetched successfully", fundTransfer));
});

export const cancelFundTransfer = asyncHandler(async (req, res) => {
  const fundTransfer = await fundTransferService.cancelFundTransfer(
    req.params.fundTransferId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Fund Transfer cancelled successfully", fundTransfer));
});
