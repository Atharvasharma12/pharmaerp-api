import mongoose from "mongoose";

import { WORKSPACE_MEMBER_STATUS } from "../constants/workspace.constant.js";

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(WORKSPACE_MEMBER_STATUS),
      default: WORKSPACE_MEMBER_STATUS.ACTIVE,
      index: true,
    },

    isOwner: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    removedAt: {
      type: Date,
      default: null,
    },

    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

workspaceMemberSchema.methods.toSafeObject = function () {
  const member = this.toObject();

  delete member.__v;

  return member;
};

workspaceMemberSchema.index(
  {
    workspaceId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

workspaceMemberSchema.index({
  workspaceId: 1,
  status: 1,
});

workspaceMemberSchema.index({
  userId: 1,
  status: 1,
});

workspaceMemberSchema.index({
  workspaceId: 1,
  isOwner: 1,
});

const WorkspaceMember =
  mongoose.models.WorkspaceMember ||
  mongoose.model("WorkspaceMember", workspaceMemberSchema);

export default WorkspaceMember;
