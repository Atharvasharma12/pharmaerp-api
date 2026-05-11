import mongoose from "mongoose";

import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspaceMember.model.js";

import { WORKSPACE_MEMBER_STATUS } from "../constants/workspace.constant.js";

const findWorkspaceById = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Workspace.findOne({
    _id: workspaceId,
    isDeleted: false,
  }).select(options.select || "");
};

const findWorkspaceBySlug = async (slug, options = {}) => {
  return Workspace.findOne({
    slug: String(slug).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findWorkspaceByCode = async (workspaceCode, options = {}) => {
  return Workspace.findOne({
    workspaceCode: String(workspaceCode).trim().toUpperCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const createWorkspace = async (payload) => {
  return Workspace.create(payload);
};

const saveWorkspace = async (workspace) => {
  return workspace.save();
};

const deleteWorkspaceById = async (workspaceId, deletedBy) => {
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
      status: "deleted",
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const createWorkspaceMember = async (payload) => {
  return WorkspaceMember.create(payload);
};

const findWorkspaceMember = async (workspaceId, userId, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  return WorkspaceMember.findOne({
    workspaceId,
    userId,
  }).select(options.select || "");
};

const getWorkspaceMembers = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return WorkspaceMember.find({
    workspaceId,
  })
    .populate(options.populate || "")
    .select(options.select || "");
};

const getUserWorkspaceMembers = async (userId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  return WorkspaceMember.find({
    userId,
    status: options.status || WORKSPACE_MEMBER_STATUS.ACTIVE,
  })
    .populate(options.populate || "workspaceId")
    .select(options.select || "");
};

const saveWorkspaceMember = async (member) => {
  return member.save();
};

const removeWorkspaceMember = async (workspaceId, userId, removedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  return WorkspaceMember.findOneAndUpdate(
    {
      workspaceId,
      userId,
    },
    {
      status: WORKSPACE_MEMBER_STATUS.INACTIVE,
      removedAt: new Date(),
      removedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const countActiveWorkspaceMembers = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  return WorkspaceMember.countDocuments({
    workspaceId,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
  });
};

export default {
  findWorkspaceById,
  findWorkspaceBySlug,
  findWorkspaceByCode,
  createWorkspace,
  saveWorkspace,
  deleteWorkspaceById,

  createWorkspaceMember,
  findWorkspaceMember,
  getWorkspaceMembers,
  getUserWorkspaceMembers,
  saveWorkspaceMember,
  removeWorkspaceMember,
  countActiveWorkspaceMembers,
};
