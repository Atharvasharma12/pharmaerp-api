import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import ApiError from "../../../../../../utils/ApiError.js";
import branchCashService from "../services/branchCash.service.js";
import branchCashRepository from "../repositories/branchCash.repository.js";
import { getBusinessDateRange } from "../../../../../../utils/businessDate.js";

/**
 * POST /branch-cash/initialize
 * Initialize BranchCash for a new branch with an opening balance.
 * All denominations go to the RUNNING partition. No shift required.
 */
export const initializeBranchCash = asyncHandler(async (req, res) => {
  const result = await branchCashService.initializeBranchCashWithOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Branch cash initialized successfully", result));
});


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
 * Withdraw cash from running, frozen, or bank slip (source discriminator).
 * Running: shift must be open. Frozen/bankslip: no shift required.

 */
export const withdrawCash = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] || req.branchId || req.body.branchId || null;
  const payload = { ...req.body, branchId };

  const result = await branchCashService.withdrawCash(
    req.workspaceId,
    req.companyId,
    req.user._id,
    payload
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash withdrawn successfully", result));
});
/**
 * Update comment to reflect new shift gate: shift always required now.
 * GET /branch-cash/:branchId/frozen-history?date=YYYY-MM-DD
 * Returns frozenLedger entries for the given date (for day-closing timeline).
 */
export const getFrozenHistory = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { date } = req.query;
  if (!date) throw new ApiError(400, "date query param is required (YYYY-MM-DD)");

  const balance = await branchCashRepository.findBalanceByBranchId(branchId, req.companyId);
  if (!balance) throw new ApiError(404, "BranchCash not found for this branch");

  const { dateFilter } = getBusinessDateRange(date);
  const start = dateFilter.$gte;
  const end   = dateFilter.$lte;

  const history = (balance.frozenLedger || []).filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Frozen history fetched", {
      currentFrozenTotal: (balance.frozenDenominations || []).reduce(
        (s, d) => s + (Number(d.denomination) || 0) * (Number(d.quantity) || 0), 0
      ),
      history,
    }));

});
