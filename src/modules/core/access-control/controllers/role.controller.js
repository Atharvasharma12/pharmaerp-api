// src/modules/core/access-control/controllers/role.controller.js

import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import roleService from "../services/role.service.js";

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(
    req.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Role created successfully", role));
});

export const getWorkspaceRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.getWorkspaceRoles(
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Roles fetched successfully", roles));
});

export const getRoleById = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(
    req.params.roleId,
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Role fetched successfully", role));
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(
    req.params.roleId,
    req.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Role updated successfully", role));
});

export const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(
    req.params.roleId,
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Role deleted successfully"));
});

export const assignRoleToMember = asyncHandler(async (req, res) => {
  const member = await roleService.assignRoleToMember(
    req.workspaceId,
    req.user._id,
    req.params.memberUserId,
    req.body.roleId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Role assigned successfully", member));
});

export const getAvailablePermissions = asyncHandler(async (req, res) => {
  const permissions = roleService.getAvailablePermissions();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Permissions fetched successfully", permissions),
    );
});
