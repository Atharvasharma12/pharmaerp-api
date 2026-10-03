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

export const directCreateWorkspaceMember = asyncHandler(async (req, res) => {
  const result = await workspaceService.directCreateMember(
    req.params.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "Staff member created and activated successfully",
        result,
      ),
    );
});

export const resetMemberPassword = asyncHandler(async (req, res) => {
  const result = await workspaceService.resetMemberPassword(
    req.params.workspaceId,
    req.user._id,
    req.params.memberUserId,
    req.body.password,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Member password reset successfully", result));
});

// ---------------------------------------------------------------------------
// Setup Center
// ---------------------------------------------------------------------------

export const getWorkspaceSetupStatus = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(
    req.params.workspaceId,
    req.user._id,
  );

  const s = workspace.setupStatus ?? {};

  // Only the 2 active steps are exposed to the frontend right now.
  // Add products/suppliers here (and in setupSteps.js) when ready.
  const steps = {
    company: { completed: Boolean(s.company) },
    branch: { completed: Boolean(s.branch) },
  };

  const completedCount = Object.values(steps).filter((step) => step.completed).length;
  const total = Object.keys(steps).length;

  return res.status(200).json(
    new ApiResponse(200, "Setup status fetched successfully", {
      workspaceId: req.params.workspaceId,
      setupCompletedAt: workspace.setupCompletedAt ?? null,
      steps,
      progress: {
        completed: completedCount,
        total,
        percentage: Math.round((completedCount / total) * 100),
      },
    }),
  );
});
