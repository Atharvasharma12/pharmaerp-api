import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import workspaceRepository from "../modules/organization/workspaces/repositories/workspace.repository.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../modules/organization/workspaces/constants/workspace.constant.js";

const getWorkspaceIdFromRequest = (req) => {
  return (
    req.headers["x-workspace-id"] ||
    req.params.workspaceId ||
    req.query.workspaceId ||
    req.body.workspaceId ||
    null
  );
};

const workspaceContextMiddleware = asyncHandler(async (req, res, next) => {
  const workspaceId = getWorkspaceIdFromRequest(req);

  if (!workspaceId) {
    throw new ApiError(400, "Workspace id is required");
  }

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  if (workspace.status !== WORKSPACE_STATUS.ACTIVE) {
    throw new ApiError(403, "Workspace is not active");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    workspace._id,
    req.user._id,
  );

  if (!member) {
    throw new ApiError(403, "You are not a member of this workspace");
  }

  if (member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "Workspace member is not active");
  }

  req.workspace = workspace;
  req.workspaceId = workspace._id.toString();

  req.workspaceMember = member;
  req.workspaceMemberId = member._id.toString();

  next();
});

export default workspaceContextMiddleware;
