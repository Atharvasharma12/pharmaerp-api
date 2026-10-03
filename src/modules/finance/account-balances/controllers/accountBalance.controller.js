import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import accountBalanceService from "../services/accountBalance.service.js";

export const getBalances = asyncHandler(async (req, res) => {
  const result = await accountBalanceService.getBalances(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account balances fetched successfully", result));
});

export const getBalanceByAccountId = asyncHandler(async (req, res) => {
  const balance = await accountBalanceService.getBalanceByAccountId(
    req.params.accountId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account balance fetched successfully", balance));
});

export const recalculateBalance = asyncHandler(async (req, res) => {
  const balance = await accountBalanceService.recalculateBalance(
    req.params.accountId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account balance recalculated successfully", balance));
});
