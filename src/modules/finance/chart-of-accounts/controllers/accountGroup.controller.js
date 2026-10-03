import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import accountGroupService from "../services/accountGroup.service.js";

export const createAccountGroup = asyncHandler(async (req, res) => {
  const group = await accountGroupService.createAccountGroup(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Account Group created successfully", group));
});

export const getAccountGroups = asyncHandler(async (req, res) => {
  const result = await accountGroupService.getAccountGroups(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account Groups fetched successfully", result));
});

export const getAccountGroupById = asyncHandler(async (req, res) => {
  const group = await accountGroupService.getAccountGroupById(
    req.params.accountGroupId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account Group fetched successfully", group));
});

export const updateAccountGroup = asyncHandler(async (req, res) => {
  const group = await accountGroupService.updateAccountGroup(
    req.params.accountGroupId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account Group updated successfully", group));
});

export const deleteAccountGroup = asyncHandler(async (req, res) => {
  await accountGroupService.deleteAccountGroup(
    req.params.accountGroupId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Account Group deleted successfully"));
});
