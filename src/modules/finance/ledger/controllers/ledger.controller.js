import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import ledgerService from "../services/ledger.service.js";

export const getLedger = asyncHandler(async (req, res) => {
  const result = await ledgerService.getLedger(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Ledger entries fetched successfully", result));
});

export const recalculateLedger = asyncHandler(async (req, res) => {
  const result = await ledgerService.recalculateLedger(
    req.body.accountId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Ledger running balances recalculated successfully", result));
});
