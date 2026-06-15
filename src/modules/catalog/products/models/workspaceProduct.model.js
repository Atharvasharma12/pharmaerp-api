import mongoose from "mongoose";

import {
  WORKSPACE_PRODUCT_STATUS,
  WORKSPACE_PRODUCT_TYPE,
  WORKSPACE_PRODUCT_SOURCE,
  WORKSPACE_PRODUCT_CODE_PREFIX,
} from "../constants/workspaceProduct.constant.js";

const workspaceProductSchema = new mongoose.Schema(
  {
    workspaceProductCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_SOURCE),
      default: WORKSPACE_PRODUCT_SOURCE.WORKSPACE,
      required: true,
    },

    productType: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_TYPE),
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    manufacturer: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    pack: {
      type: String,
      trim: true,
    },

    qty: {
      type: String,
      trim: true,
    },

    productForm: {
      type: String,
      trim: true,
    },

    HsnMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HsnMaster",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: Object.values(WORKSPACE_PRODUCT_STATUS),
      default: WORKSPACE_PRODUCT_STATUS.ACTIVE,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

const generateWorkspaceProductCode = async () => {
  const WorkspaceProduct = mongoose.models.WorkspaceProduct;

  while (true) {
    const code = `${WORKSPACE_PRODUCT_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await WorkspaceProduct.exists({
      workspaceProductCode: code,
      isDeleted: false,
    });

    if (!exists) {
      return code;
    }
  }
};

workspaceProductSchema.pre("validate", async function () {
  if (!this.workspaceProductCode) {
    this.workspaceProductCode = await generateWorkspaceProductCode();
  }
});

workspaceProductSchema.methods.toSafeObject = function () {
  const product = this.toObject();

  delete product.__v;

  return product;
};

// ---------------------
// Indexes
// ---------------------

workspaceProductSchema.index(
  {
    workspaceProductCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

workspaceProductSchema.index(
  {
    workspaceId: 1,
    name: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

workspaceProductSchema.index({
  workspaceId: 1,
  status: 1,
  isDeleted: 1,
});

workspaceProductSchema.index({
  workspaceId: 1,
  productType: 1,
});

workspaceProductSchema.index({
  workspaceId: 1,
  createdBy: 1,
});

const WorkspaceProduct =
  mongoose.models.WorkspaceProduct ||
  mongoose.model("WorkspaceProduct", workspaceProductSchema);

export default WorkspaceProduct;
