// src/modules/core/access-control/repositories/role.repository.js

import mongoose from "mongoose";

import Role from "../models/role.model.js";

const findRoleById = async (roleId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    return null;
  }

  return Role.findOne({
    _id: roleId,
    isDeleted: false,
  }).select(options.select || "");
};

const findRoleByIdAndWorkspace = async (roleId, workspaceId, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(roleId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Role.findOne({
    _id: roleId,
    workspaceId,
    isDeleted: false,
  }).select(options.select || "");
};

const findRoleByCode = async (workspaceId, code, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Role.findOne({
    workspaceId,
    code: String(code).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const createRole = async (payload) => {
  return Role.create(payload);
};

const saveRole = async (role) => {
  return role.save();
};

const getWorkspaceRoles = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return Role.find({
    workspaceId,
    isDeleted: false,
  })
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const getSystemRoles = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return Role.find({
    workspaceId,
    isSystem: true,
    isDeleted: false,
  })
    .sort(options.sort || { createdAt: 1 })
    .select(options.select || "");
};

const getCustomRoles = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return Role.find({
    workspaceId,
    isSystem: false,
    isDeleted: false,
  })
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const deleteRoleById = async (roleId, workspaceId, deletedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(roleId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Role.findOneAndUpdate(
    {
      _id: roleId,
      workspaceId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const countWorkspaceRoles = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  return Role.countDocuments({
    workspaceId,
    isDeleted: false,
  });
};

export default {
  findRoleById,
  findRoleByIdAndWorkspace,
  findRoleByCode,

  createRole,
  saveRole,

  getWorkspaceRoles,
  getSystemRoles,
  getCustomRoles,

  deleteRoleById,

  countWorkspaceRoles,
};
