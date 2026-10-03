import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformWorkspaceService from "../services/platformWorkspace.service.js";

/**
 * GET /platform/workspaces
 * List all workspaces with optional filters/search/pagination.
 */
export const getPlatformWorkspaces = asyncHandler(async (req, res) => {
  const result = await platformWorkspaceService.getPlatformWorkspaces(
    req.query,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspaces fetched successfully", result));
});

/**
 * GET /platform/workspaces/:workspaceId
 * Get a single workspace by ID.
 */
export const getPlatformWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await platformWorkspaceService.getPlatformWorkspaceById(
    req.params.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace fetched successfully", workspace));
});

/**
 * PATCH /platform/workspaces/:workspaceId/status
 * Update workspace status (active / inactive / suspended).
 */
export const updatePlatformWorkspaceStatus = asyncHandler(async (req, res) => {
  const workspace =
    await platformWorkspaceService.updatePlatformWorkspaceStatus(
      req.params.workspaceId,
      req.body.status,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace status updated successfully", workspace),
    );
});

/**
 * DELETE /platform/workspaces/:workspaceId
 * Soft-delete a workspace.
 */
export const deletePlatformWorkspace = asyncHandler(async (req, res) => {
  await platformWorkspaceService.deletePlatformWorkspace(
    req.params.workspaceId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace deleted successfully"));
});

/**
 * GET /platform/workspaces/:workspaceId/members
 * List all members of a workspace.
 */
export const getPlatformWorkspaceMembers = asyncHandler(async (req, res) => {
  const members = await platformWorkspaceService.getPlatformWorkspaceMembers(
    req.params.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Workspace members fetched successfully",
        members,
      ),
    );
});
