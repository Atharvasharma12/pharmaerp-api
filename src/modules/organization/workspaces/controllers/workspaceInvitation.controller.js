import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import workspaceInvitationService from "../services/workspaceInvitation.service.js";

export const inviteWorkspaceMember = asyncHandler(async (req, res) => {
  const invitation = await workspaceInvitationService.inviteMember(
    req.params.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "Workspace invitation created successfully",
        invitation,
      ),
    );
});

export const getWorkspaceInvitations = asyncHandler(async (req, res) => {
  const invitations = await workspaceInvitationService.getWorkspaceInvitations(
    req.params.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Workspace invitations fetched successfully",
        invitations,
      ),
    );
});

export const getIncomingUserInvitations = asyncHandler(async (req, res) => {
  // Pulling target email directly out of current validated authenticated user session context guard
  const invitations =
    await workspaceInvitationService.getIncomingUserInvitations(req.user.email);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "User personal incoming invitations fetched successfully",
        invitations,
      ),
    );
});
export const cancelWorkspaceInvitation = asyncHandler(async (req, res) => {
  const invitation = await workspaceInvitationService.cancelInvitation(
    req.params.workspaceId,
    req.user._id,
    req.params.invitationId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Workspace invitation cancelled successfully",
        invitation,
      ),
    );
});

export const acceptWorkspaceInvitation = asyncHandler(async (req, res) => {
  const result = await workspaceInvitationService.acceptInvitation(
    req.params.token,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Workspace invitation accepted successfully",
        result,
      ),
    );
});
