import mongoose from "mongoose";

import {
  WORKSPACE_STATUS,
  WORKSPACE_TYPE,
  DEFAULT_WORKSPACE_SETTINGS,
  WORKSPACE_CODE_PREFIX,
} from "../constants/workspace.constant.js";

const IMAGE_SCHEMA = new mongoose.Schema(
  {
    publicId: {
      type: String,
      trim: true,
      default: null,
    },
    url: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const ADDRESS_SCHEMA = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: null,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    pincode: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const SETTINGS_SCHEMA = new mongoose.Schema(
  {
    timezone: {
      type: String,
      trim: true,
      default: DEFAULT_WORKSPACE_SETTINGS.timezone,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: DEFAULT_WORKSPACE_SETTINGS.currency,
    },
    dateFormat: {
      type: String,
      trim: true,
      default: DEFAULT_WORKSPACE_SETTINGS.dateFormat,
    },
    timeFormat: {
      type: String,
      trim: true,
      default: DEFAULT_WORKSPACE_SETTINGS.timeFormat,
    },
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema(
  {
    workspaceCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [2, "Workspace name must be at least 2 characters"],
      maxlength: [120, "Workspace name cannot exceed 120 characters"],
    },

    slug: {
      type: String,
      required: [true, "Workspace slug is required"],
      trim: true,
      lowercase: true,
      maxlength: [140, "Workspace slug cannot exceed 140 characters"],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Workspace slug can only contain lowercase letters, numbers and hyphens",
      ],
    },

    type: {
      type: String,
      enum: Object.values(WORKSPACE_TYPE),
      default: WORKSPACE_TYPE.PHARMACY,
      index: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Workspace owner is required"],
      index: true,
    },

    logo: {
      type: IMAGE_SCHEMA,
      default: null,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [200, "Email cannot exceed 200 characters"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid phone number"],
      default: null,
    },

    address: {
      type: ADDRESS_SCHEMA,
      default: null,
    },

    settings: {
      type: SETTINGS_SCHEMA,
      default: () => DEFAULT_WORKSPACE_SETTINGS,
    },

    status: {
      type: String,
      enum: Object.values(WORKSPACE_STATUS),
      default: WORKSPACE_STATUS.ACTIVE,
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
  },
  {
    timestamps: true,
  },
);

const generateWorkspaceCode = async () => {
  const Workspace = mongoose.models.Workspace;

  while (true) {
    const code = `${WORKSPACE_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await Workspace.exists({
      workspaceCode: code,
      isDeleted: false,
    });

    if (!exists) return code;
  }
};

workspaceSchema.pre("validate", async function () {
  if (!this.workspaceCode) {
    this.workspaceCode = await generateWorkspaceCode();
  }

  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

workspaceSchema.methods.toSafeObject = function () {
  const workspace = this.toObject();

  delete workspace.__v;

  return workspace;
};

workspaceSchema.index(
  { workspaceCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

workspaceSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

workspaceSchema.index({ ownerId: 1, isDeleted: 1 });
workspaceSchema.index({ status: 1, isDeleted: 1 });

const Workspace =
  mongoose.models.Workspace || mongoose.model("Workspace", workspaceSchema);

export default Workspace;
