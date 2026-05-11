import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import workspaceService from "../services/workspace.service.js";

export const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Workspace created successfully", workspace));
});

export const getMyWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.getMyWorkspaces(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspaces fetched successfully", workspaces));
});

export const getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(
    req.params.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace fetched successfully", workspace));
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(
    req.params.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace updated successfully", workspace));
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.workspaceId, req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace deleted successfully"));
});

export const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const members = await workspaceService.getWorkspaceMembers(
    req.params.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace members fetched successfully", members),
    );
});

export const addWorkspaceMember = asyncHandler(async (req, res) => {
  const member = await workspaceService.addWorkspaceMember(
    req.params.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Workspace member added successfully", member));
});

export const updateWorkspaceMemberStatus = asyncHandler(async (req, res) => {
  const member = await workspaceService.updateWorkspaceMemberStatus(
    req.params.workspaceId,
    req.user._id,
    req.params.memberUserId,
    req.body.status,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Workspace member status updated successfully",
        member,
      ),
    );
});

export const removeWorkspaceMember = asyncHandler(async (req, res) => {
  const member = await workspaceService.removeWorkspaceMember(
    req.params.workspaceId,
    req.user._id,
    req.params.memberUserId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace member removed successfully", member),
    );
});
