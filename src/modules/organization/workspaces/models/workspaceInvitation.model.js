import mongoose from "mongoose";
import crypto from "crypto";

import { WORKSPACE_INVITATION_STATUS } from "../constants/workspace.constant.js";

const workspaceInvitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    invitedEmail: {
      type: String,
      required: [true, "Invited email is required"],
      trim: true,
      lowercase: true,
      maxlength: [200, "Email cannot exceed 200 characters"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      index: true,
    },

    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
      index: true,
    },

    accessAllCompanies: {
      type: Boolean,
      default: false,
    },

    accessAllBranches: {
      type: Boolean,
      default: false,
    },

    companyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
    ],

    branchAccess: [
      {
        branchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Branch",
          required: true,
        },
        roleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Role",
          default: null,
        },
        canOperateMarketplaceStore: {
          type: Boolean,
          default: false,
        },
      },
    ],

    resendCount: {
      type: Number,
      default: 0,
    },

    lastResentAt: {
      type: Date,
      default: null,
    },

    tokenHash: {
      type: String,
      required: true,
      select: false,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, "Invitation expiry is required"],
      index: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Invited by is required"],
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(WORKSPACE_INVITATION_STATUS),
      default: WORKSPACE_INVITATION_STATUS.PENDING,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

workspaceInvitationSchema.methods.createInvitationToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  return rawToken;
};

workspaceInvitationSchema.methods.isExpired = function () {
  return new Date(this.expiresAt) <= new Date();
};

workspaceInvitationSchema.methods.toSafeObject = function () {
  const invitation = this.toObject();

  delete invitation.tokenHash;
  delete invitation.__v;

  return invitation;
};

workspaceInvitationSchema.index(
  {
    workspaceId: 1,
    invitedEmail: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: WORKSPACE_INVITATION_STATUS.PENDING,
    },
  },
);

workspaceInvitationSchema.index({
  workspaceId: 1,
  status: 1,
});

workspaceInvitationSchema.index({
  invitedEmail: 1,
  status: 1,
});

workspaceInvitationSchema.index({
  expiresAt: 1,
  status: 1,
});

const WorkspaceInvitation =
  mongoose.models.WorkspaceInvitation ||
  mongoose.model("WorkspaceInvitation", workspaceInvitationSchema);

export default WorkspaceInvitation;
