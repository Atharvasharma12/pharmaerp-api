import mongoose from "mongoose";

import WorkspaceInvitation from "../models/workspaceInvitation.model.js";

import { WORKSPACE_INVITATION_STATUS } from "../constants/workspace.constant.js";

const findInvitationById = async (invitationId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    return null;
  }

  const query = WorkspaceInvitation.findOne({
    _id: invitationId,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const findPendingInvitationByEmail = async (
  workspaceId,
  invitedEmail,
  options = {},
) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  const query = WorkspaceInvitation.findOne({
    workspaceId,
    invitedEmail: String(invitedEmail).trim().toLowerCase(),
    status: WORKSPACE_INVITATION_STATUS.PENDING,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const findInvitationByTokenHash = async (tokenHash, options = {}) => {
  const query = WorkspaceInvitation.findOne({
    tokenHash,
    status: WORKSPACE_INVITATION_STATUS.PENDING,
  });

  if (options.populate) {
    query.populate(options.populate);
  }

  return query.select(options.select || "+tokenHash");
};

const createInvitation = async (payload) => {
  return WorkspaceInvitation.create(payload);
};

const saveInvitation = async (invitation) => {
  return invitation.save();
};

const getWorkspaceInvitations = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  const query = WorkspaceInvitation.find({
    workspaceId,
  });

  if (options.status) {
    query.where({
      status: options.status,
    });
  }

  if (options.populate) {
    query.populate(options.populate);
  }

  return query
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const countPendingInvitations = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  return WorkspaceInvitation.countDocuments({
    workspaceId,
    status: WORKSPACE_INVITATION_STATUS.PENDING,
    expiresAt: {
      $gt: new Date(),
    },
  });
};

const cancelInvitationById = async (invitationId, cancelledBy) => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    return null;
  }

  return WorkspaceInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      status: WORKSPACE_INVITATION_STATUS.PENDING,
    },
    {
      status: WORKSPACE_INVITATION_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const markInvitationAccepted = async (invitationId, acceptedBy) => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) {
    return null;
  }

  return WorkspaceInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      status: WORKSPACE_INVITATION_STATUS.PENDING,
    },
    {
      status: WORKSPACE_INVITATION_STATUS.ACCEPTED,
      acceptedAt: new Date(),
      acceptedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const markExpiredInvitations = async () => {
  return WorkspaceInvitation.updateMany(
    {
      status: WORKSPACE_INVITATION_STATUS.PENDING,
      expiresAt: {
        $lte: new Date(),
      },
    },
    {
      status: WORKSPACE_INVITATION_STATUS.EXPIRED,
    },
  );
};

export default {
  findInvitationById,
  findPendingInvitationByEmail,
  findInvitationByTokenHash,
  createInvitation,
  saveInvitation,
  getWorkspaceInvitations,
  countPendingInvitations,
  cancelInvitationById,
  markInvitationAccepted,
  markExpiredInvitations,
};
