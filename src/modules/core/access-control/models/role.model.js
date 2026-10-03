// src/modules/core/access-control/models/role.model.js

import mongoose from "mongoose";

import { ROLE_STATUS } from "../constants/role.constant.js";
import { ALL_PERMISSIONS } from "../constants/permission.constant.js";

const roleSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      minlength: [2, "Role name must be at least 2 characters"],
      maxlength: [80, "Role name cannot exceed 80 characters"],
    },

    code: {
      type: String,
      required: [true, "Role code is required"],
      trim: true,
      lowercase: true,
      maxlength: [100, "Role code cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.every((permission) =>
            ALL_PERMISSIONS.includes(permission),
          );
        },
        message: "Invalid permission found",
      },
    },

    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },

    isEditable: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: Object.values(ROLE_STATUS),
      default: ROLE_STATUS.ACTIVE,
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
  },
);

roleSchema.methods.toSafeObject = function () {
  const role = this.toObject();

  delete role.__v;

  return role;
};

roleSchema.index(
  {
    workspaceId: 1,
    code: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

roleSchema.index({ workspaceId: 1, isDeleted: 1 });
roleSchema.index({ workspaceId: 1, status: 1, isDeleted: 1 });
roleSchema.index({ workspaceId: 1, isSystem: 1, isDeleted: 1 });
roleSchema.index({ createdBy: 1, isDeleted: 1 });

const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

export default Role;
