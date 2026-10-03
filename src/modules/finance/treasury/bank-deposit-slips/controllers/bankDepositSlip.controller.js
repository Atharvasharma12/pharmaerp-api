import bankDepositSlipService from "../services/bankDepositSlip.service.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";
import asyncHandler from "../../../../../utils/asyncHandler.js";

// ── Create Slip ───────────────────────────────────────────────────────────────

export const createBankDepositSlip = asyncHandler(async (req, res) => {
  const { workspaceId, companyId, user } = req;
  const slip = await bankDepositSlipService.createBankDepositSlip(
    workspaceId,
    companyId,
    user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Bank deposit slip created successfully", slip));
});

// ── List Slips ────────────────────────────────────────────────────────────────

export const getBankDepositSlips = asyncHandler(async (req, res) => {
  const { workspaceId, companyId } = req;
  const result = await bankDepositSlipService.getBankDepositSlips(
    workspaceId,
    companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank deposit slips retrieved successfully", result));
});

// ── Get By ID ─────────────────────────────────────────────────────────────────

export const getBankDepositSlipById = asyncHandler(async (req, res) => {
  const { workspaceId, companyId } = req;
  const { slipId } = req.params;
  const slip = await bankDepositSlipService.getBankDepositSlipById(
    slipId,
    companyId,
    workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank deposit slip retrieved successfully", slip));
});

// ── Confirm Deposit ───────────────────────────────────────────────────────────

export const confirmDeposit = asyncHandler(async (req, res) => {
  const { workspaceId, companyId, user } = req;
  const { slipId } = req.params;
  const slip = await bankDepositSlipService.confirmDeposit(
    slipId,
    companyId,
    workspaceId,
    user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank deposit confirmed successfully", slip));
});

// ── Cancel Slip ───────────────────────────────────────────────────────────────

export const cancelBankDepositSlip = asyncHandler(async (req, res) => {
  const { workspaceId, companyId, user } = req;
  const { slipId } = req.params;
  const slip = await bankDepositSlipService.cancelBankDepositSlip(
    slipId,
    companyId,
    workspaceId,
    user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank deposit slip cancelled successfully", slip));
});
