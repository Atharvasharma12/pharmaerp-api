// src/modules/core/access-control/repositories/memberAccess.repository.js

import mongoose from "mongoose";

import MemberAccess from "../models/memberAccess.model.js";

const createMemberAccess = async (payload) => {
  return MemberAccess.create(payload);
};

const findMemberAccessById = async (accessId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(accessId)) {
    return null;
  }

  const query = MemberAccess.findOne({
    _id: accessId,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const findMemberAccessByMemberId = async (workspaceMemberId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceMemberId)) {
    return null;
  }

  const query = MemberAccess.findOne({
    workspaceMemberId,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const findMemberAccessByUserAndWorkspace = async (
  workspaceId,
  userId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  const query = MemberAccess.findOne({
    workspaceId,
    userId,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const getWorkspaceMemberAccessList = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  const query = MemberAccess.find({
    workspaceId,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const updateMemberAccessByMemberId = async (
  workspaceMemberId,
  payload,
  options = {},
) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceMemberId)) {
    return null;
  }

  return MemberAccess.findOneAndUpdate(
    {
      workspaceMemberId,
    },
    payload,
    {
      new: true,
      runValidators: true,
      ...options,
    },
  );
};

const updateMemberAccessByUserAndWorkspace = async (
  workspaceId,
  userId,
  payload,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  return MemberAccess.findOneAndUpdate(
    {
      workspaceId,
      userId,
    },
    payload,
    {
      new: true,
      runValidators: true,
      ...options,
    },
  );
};

const upsertMemberAccess = async (payload) => {
  return MemberAccess.findOneAndUpdate(
    {
      workspaceMemberId: payload.workspaceMemberId,
    },
    {
      $set: payload,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const deleteMemberAccessByMemberId = async (workspaceMemberId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceMemberId)) {
    return null;
  }

  return MemberAccess.findOneAndDelete({
    workspaceMemberId,
  });
};

const hasCompanyAccess = async (workspaceId, userId, companyId) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return false;
  }

  const access = await MemberAccess.findOne({
    workspaceId,
    userId,
    $or: [{ accessAllCompanies: true }, { companyIds: companyId }],
  }).select("_id");

  return Boolean(access);
};

const hasBranchAccess = async (workspaceId, userId, branchId) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(branchId)
  ) {
    return false;
  }

  const access = await MemberAccess.findOne({
    workspaceId,
    userId,
    $or: [{ accessAllBranches: true }, { branchIds: branchId }],
  }).select("_id");

  return Boolean(access);
};

export default {
  createMemberAccess,

  findMemberAccessById,
  findMemberAccessByMemberId,
  findMemberAccessByUserAndWorkspace,

  getWorkspaceMemberAccessList,

  updateMemberAccessByMemberId,
  updateMemberAccessByUserAndWorkspace,
  upsertMemberAccess,

  deleteMemberAccessByMemberId,

  hasCompanyAccess,
  hasBranchAccess,
};
