import mongoose from "mongoose";

import Workspace from "../../../organization/workspaces/models/workspace.model.js";
import WorkspaceMember from "../../../organization/workspaces/models/workspaceMember.model.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../../../organization/workspaces/constants/workspace.constant.js";

/**
 * Get all workspaces with optional filtering and pagination.
 */
const getWorkspaces = async (filters = {}, options = {}) => {
  const query = {
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.ownerId && mongoose.Types.ObjectId.isValid(filters.ownerId)) {
    query.ownerId = filters.ownerId;
  }

  if (filters.search) {
    const regex = new RegExp(String(filters.search).trim(), "i");
    query.$or = [{ name: regex }, { slug: regex }, { workspaceCode: regex }];
  }

  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [workspaces, total] = await Promise.all([
    Workspace.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(options.populate || "ownerId"),
    Workspace.countDocuments(query),
  ]);

  return {
    workspaces,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Find a workspace by its ID.
 */
const findWorkspaceById = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Workspace.findOne({
    _id: workspaceId,
    isDeleted: false,
  })
    .populate(options.populate || "ownerId")
    .select(options.select || "");
};

/**
 * Find a workspace by slug.
 */
const findWorkspaceBySlug = async (slug, options = {}) => {
  return Workspace.findOne({
    slug: String(slug).trim().toLowerCase(),
    isDeleted: false,
  })
    .populate(options.populate || "")
    .select(options.select || "");
};

/**
 * Find a workspace by code.
 */
const findWorkspaceByCode = async (workspaceCode, options = {}) => {
  return Workspace.findOne({
    workspaceCode: String(workspaceCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .populate(options.populate || "")
    .select(options.select || "");
};

/**
 * Update a workspace's status (active / inactive / suspended).
 */
const updateWorkspaceStatus = async (workspaceId, status, updatedBy = null) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Workspace.findOneAndUpdate(
    {
      _id: workspaceId,
      isDeleted: false,
    },
    { status },
    { new: true, runValidators: true },
  );
};

/**
 * Soft-delete a workspace (platform admin action).
 */
const softDeleteWorkspace = async (workspaceId, platformUserId = null) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Workspace.findOneAndUpdate(
    {
      _id: workspaceId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      status: WORKSPACE_STATUS.DELETED,
      deletedAt: new Date(),
      deletedBy: platformUserId,
    },
    { new: true, runValidators: true },
  );
};

/**
 * Save (update) a workspace document.
 */
const saveWorkspace = async (workspace) => {
  return workspace.save();
};

/**
 * Get all members of a workspace.
 */
const getWorkspaceMembers = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  const query = WorkspaceMember.find({ workspaceId });

  if (options.status) {
    query.where({ status: options.status });
  }

  if (options.populate) {
    query.populate(options.populate);
  } else {
    query.populate("userId roleId");
  }

  return query
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

/**
 * Count active members for a workspace.
 */
const countActiveWorkspaceMembers = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  return WorkspaceMember.countDocuments({
    workspaceId,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
  });
};

/**
 * Count all workspaces (with optional filters).
 */
const countWorkspaces = async (filters = {}) => {
  const query = { isDeleted: false };

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  return Workspace.countDocuments(query);
};

export default {
  getWorkspaces,
  findWorkspaceById,
  findWorkspaceBySlug,
  findWorkspaceByCode,
  updateWorkspaceStatus,
  softDeleteWorkspace,
  saveWorkspace,
  getWorkspaceMembers,
  countActiveWorkspaceMembers,
  countWorkspaces,
};
