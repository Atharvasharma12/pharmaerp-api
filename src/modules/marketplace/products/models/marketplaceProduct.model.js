import mongoose from "mongoose";

import {
  MARKETPLACE_PRODUCT_STATUS,
  MARKETPLACE_PRODUCT_VISIBILITY,
  MARKETPLACE_PRODUCT_PRESCRIPTION,
} from "../constants/marketplaceProduct.constant.js";

const marketplaceProductSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    marketplaceStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      required: [true, "Marketplace store is required"],
      index: true,
    },

    // Reference to global platform product — NOT workspace product
    globalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalProduct",
      required: [true, "Global product is required"],
      index: true,
    },

    visibility: {
      type: String,
      enum: Object.values(MARKETPLACE_PRODUCT_VISIBILITY),
      default: MARKETPLACE_PRODUCT_VISIBILITY.VISIBLE,
      index: true,
    },

    prescriptionRequired: {
      type: String,
      enum: Object.values(MARKETPLACE_PRODUCT_PRESCRIPTION),
      default: MARKETPLACE_PRODUCT_PRESCRIPTION.NOT_REQUIRED,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(MARKETPLACE_PRODUCT_STATUS),
      default: MARKETPLACE_PRODUCT_STATUS.ACTIVE,
      index: true,
    },

    enabledAt: {
      type: Date,
      default: null,
    },

    enabledBy: {
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

marketplaceProductSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.__v;

  return obj;
};

// One store can enable each global product only once
marketplaceProductSchema.index(
  { marketplaceStoreId: 1, globalProductId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

marketplaceProductSchema.index({ marketplaceStoreId: 1, status: 1, isDeleted: 1 });
marketplaceProductSchema.index({ marketplaceStoreId: 1, visibility: 1, isDeleted: 1 });
marketplaceProductSchema.index({ marketplaceStoreId: 1, isFeatured: 1, isDeleted: 1 });

const MarketplaceProduct =
  mongoose.models.MarketplaceProduct ||
  mongoose.model("MarketplaceProduct", marketplaceProductSchema);

export default MarketplaceProduct;
