import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import cashAccountService from "../services/cashAccount.service.js";

export const createCashAccount = asyncHandler(async (req, res) => {
  const cashAccount = await cashAccountService.createCashAccount(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Cash Account created successfully", cashAccount));
});

export const getCashAccounts = asyncHandler(async (req, res) => {
  const result = await cashAccountService.getCashAccounts(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Accounts fetched successfully", result));
});

export const getCashAccountById = asyncHandler(async (req, res) => {
  const cashAccount = await cashAccountService.getCashAccountById(
    req.params.cashAccountId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Account fetched successfully", cashAccount));
});

export const updateCashAccount = asyncHandler(async (req, res) => {
  const cashAccount = await cashAccountService.updateCashAccount(
    req.params.cashAccountId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Account updated successfully", cashAccount));
});

export const deleteCashAccount = asyncHandler(async (req, res) => {
  const result = await cashAccountService.deleteCashAccount(
    req.params.cashAccountId,
    req.companyId,
    req.workspaceId,
    req.user._id,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Account deleted successfully", result));
});

export const setPrimary = asyncHandler(async (req, res) => {
  const cashAccount = await cashAccountService.updateCashAccount(
    req.params.cashAccountId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    { isPrimary: true },
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Account set as primary successfully", cashAccount));
});
