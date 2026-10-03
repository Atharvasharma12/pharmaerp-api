import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import branchCashService from "../services/branchCash.service.js";

/**
 * GET /branch-cash
 * List all branches' cash for the current company.
 */
export const getAllBranchCash = asyncHandler(async (req, res) => {
  const result = await branchCashService.getAllByCompany(
    req.workspaceId,
    req.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Branch cash fetched successfully", result));
});

/**
 * GET /branch-cash/:branchId
 * Get running + frozen cash and denomination breakdown for a branch.
 */
export const getBranchCash = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const result = await branchCashService.getByBranchId(branchId, req.companyId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Branch cash fetched successfully", result));
});

/**
 * POST /branch-cash/deposit
 * Deposit external cash into the RUNNING partition.
 * Constraint: shift must be open.
 */
export const depositCash = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] || req.branchId || req.body.branchId || null;
  const payload = { ...req.body, branchId };

  const result = await branchCashService.manualDeposit(
    req.workspaceId,
    req.companyId,
    req.user._id,
    payload
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash deposited to running balance successfully", result));
});

/**
 * POST /branch-cash/withdraw
 * Withdraw cash from the FROZEN partition.
 * No shift requirement.
 */
export const withdrawCash = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] || req.branchId || req.body.branchId || null;
  const payload = { ...req.body, branchId };

  const result = await branchCashService.manualWithdraw(
    req.workspaceId,
    req.companyId,
    req.user._id,
    payload
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash withdrawn from frozen reserve successfully", result));
});
