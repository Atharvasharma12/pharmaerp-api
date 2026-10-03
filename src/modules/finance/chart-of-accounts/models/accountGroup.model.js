import mongoose from "mongoose";

import {
  ACCOUNT_GROUP_NATURE,
  ACCOUNT_GROUP_STATUS,
} from "../constants/accountGroup.constant.js";

const accountGroupSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
      index: true,
    },

    groupCode: {
      type: String,
      required: [true, "Group code is required"],
      trim: true,
      uppercase: true,
    },

    groupName: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [2, "Group name must be at least 2 characters"],
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },

    parentGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountGroup",
      default: null,
      index: true,
    },

    nature: {
      type: String,
      required: [true, "Nature is required"],
      enum: Object.values(ACCOUNT_GROUP_NATURE),
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    isSystemGroup: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ACCOUNT_GROUP_STATUS),
      default: ACCOUNT_GROUP_STATUS.ACTIVE,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accountGroupSchema.methods.toSafeObject = function () {
  const group = this.toObject();
  delete group.__v;
  return group;
};

// Unique index: groupCode must be unique per company
accountGroupSchema.index(
  { companyId: 1, groupCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Unique index: groupName must be unique per company
accountGroupSchema.index(
  { companyId: 1, groupName: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

accountGroupSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
});

accountGroupSchema.index({
  workspaceId: 1,
  companyId: 1,
  parentGroupId: 1,
  isDeleted: 1,
});

accountGroupSchema.index({
  workspaceId: 1,
  companyId: 1,
  nature: 1,
  status: 1,
  isDeleted: 1,
});

const AccountGroup =
  mongoose.models.AccountGroup ||
  mongoose.model("AccountGroup", accountGroupSchema);

export default AccountGroup;
