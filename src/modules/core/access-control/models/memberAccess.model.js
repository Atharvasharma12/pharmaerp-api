// src/modules/core/access-control/models/memberAccess.model.js

import mongoose from "mongoose";

const branchRoleAccessSchema = new mongoose.Schema(
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
  { _id: false },
);

const memberAccessSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    workspaceMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceMember",
      required: [true, "Workspace member is required"],
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    accessAllCompanies: {
      type: Boolean,
      default: true,
      index: true,
    },

    accessAllBranches: {
      type: Boolean,
      default: true,
      index: true,
    },

    companyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
    ],

    branchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],

    branchAccess: {
      type: [branchRoleAccessSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

memberAccessSchema.methods.toSafeObject = function () {
  const access = this.toObject();

  delete access.__v;

  return access;
};

memberAccessSchema.index({
  workspaceId: 1,
  userId: 1,
});

memberAccessSchema.index({
  workspaceId: 1,
  accessAllCompanies: 1,
});

memberAccessSchema.index({
  workspaceId: 1,
  accessAllBranches: 1,
});

memberAccessSchema.index({
  workspaceId: 1,
  companyIds: 1,
});

memberAccessSchema.index({
  workspaceId: 1,
  branchIds: 1,
});

const MemberAccess =
  mongoose.models.MemberAccess ||
  mongoose.model("MemberAccess", memberAccessSchema);

export default MemberAccess;
