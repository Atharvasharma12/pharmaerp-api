import ApiError from "../../../../utils/ApiError.js";

import platformWorkspaceRepository from "../repositories/platformWorkspace.repository.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_TYPE,
} from "../../../organization/workspaces/constants/workspace.constant.js";

/**
 * List all workspaces (with optional filters, search, pagination).
 */
const getPlatformWorkspaces = async (query = {}) => {
  const filters = {};
  const options = {};

  if (query.status) filters.status = query.status;
  if (query.type) filters.type = query.type;
  if (query.ownerId) filters.ownerId = query.ownerId;
  if (query.search) filters.search = query.search;

  if (query.page) options.page = query.page;
  if (query.limit) options.limit = query.limit;

  return platformWorkspaceRepository.getWorkspaces(filters, options);
};

/**
 * Get a single workspace by its ID.
 */
const getPlatformWorkspaceById = async (workspaceId) => {
  const workspace =
    await platformWorkspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return workspace.toSafeObject();
};

/**
 * Update a workspace's status.
 */
const updatePlatformWorkspaceStatus = async (
  workspaceId,
  status,
  platformUser,
) => {
  const allowedStatuses = [
    WORKSPACE_STATUS.ACTIVE,
    WORKSPACE_STATUS.INACTIVE,
    WORKSPACE_STATUS.SUSPENDED,
  ];

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid workspace status");
  }

  const workspace =
    await platformWorkspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  workspace.status = status;

  await platformWorkspaceRepository.saveWorkspace(workspace);

  return workspace.toSafeObject();
};

/**
 * Soft-delete a workspace (hard admin action).
 */
const deletePlatformWorkspace = async (workspaceId, platformUser) => {
  const workspace =
    await platformWorkspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const deleted = await platformWorkspaceRepository.softDeleteWorkspace(
    workspaceId,
    platformUser?._id || null,
  );

  if (!deleted) {
    throw new ApiError(500, "Failed to delete workspace");
  }

  return { success: true };
};

/**
 * Get all members of a workspace.
 */
const getPlatformWorkspaceMembers = async (workspaceId) => {
  const workspace =
    await platformWorkspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const members =
    await platformWorkspaceRepository.getWorkspaceMembers(workspaceId);

  return members.map((m) => m.toSafeObject());
};

export default {
  getPlatformWorkspaces,
  getPlatformWorkspaceById,
  updatePlatformWorkspaceStatus,
  deletePlatformWorkspace,
  getPlatformWorkspaceMembers,
};
