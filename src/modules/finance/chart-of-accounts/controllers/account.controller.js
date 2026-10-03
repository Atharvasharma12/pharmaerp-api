import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import accountService from "../services/account.service.js";

export const createAccount = asyncHandler(async (req, res) => {
  const account = await accountService.createAccount(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Account created successfully", account));
});

export const getAccounts = asyncHandler(async (req, res) => {
  const result = await accountService.getAccounts(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Accounts fetched successfully", result));
});

export const getAccountById = asyncHandler(async (req, res) => {
  const account = await accountService.getAccountById(
    req.params.accountId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account fetched successfully", account));
});

export const updateAccount = asyncHandler(async (req, res) => {
  const account = await accountService.updateAccount(
    req.params.accountId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account updated successfully", account));
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await accountService.deleteAccount(
    req.params.accountId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account deleted successfully"));
});
