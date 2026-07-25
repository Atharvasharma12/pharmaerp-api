import mongoose from "mongoose";

import {
  MARKETPLACE_STORE_STATUS,
  MARKETPLACE_STORE_ONLINE_STATUS,
  MARKETPLACE_STORE_VERIFICATION_STATUS,
  MARKETPLACE_STORE_ONBOARDING_STATUS,
  MARKETPLACE_STORE_CODE_PREFIX,
} from "../constants/marketplaceStore.constant.js";

const WORKING_HOURS_DAY_SCHEMA = new mongoose.Schema(
  {
    isOpen: {
      type: Boolean,
      default: true,
    },
    openTime: {
      type: String,
      trim: true,
      default: "09:00",
    },
    closeTime: {
      type: String,
      trim: true,
      default: "21:00",
    },
  },
  { _id: false },
);

const WORKING_HOURS_SCHEMA = new mongoose.Schema(
  {
    monday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    tuesday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    wednesday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    thursday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    friday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    saturday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
    sunday: { type: WORKING_HOURS_DAY_SCHEMA, default: () => ({}) },
  },
  { _id: false },
);

const generateStoreCode = async () => {
  const MarketplaceStore = mongoose.models.MarketplaceStore;

  while (true) {
    const code = `${MARKETPLACE_STORE_CODE_PREFIX}${String(
      Math.floor(100000 + Math.random() * 900000),
    )}`;

    const exists = await MarketplaceStore.exists({
      storeCode: code,
      isDeleted: false,
    });

    if (!exists) return code;
  }
};

const marketplaceStoreSchema = new mongoose.Schema(
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

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
      index: true,
    },

    storeCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      minlength: [2, "Store name must be at least 2 characters"],
      maxlength: [160, "Store name cannot exceed 160 characters"],
    },

    verificationStatus: {
      type: String,
      enum: Object.values(MARKETPLACE_STORE_VERIFICATION_STATUS),
      default: MARKETPLACE_STORE_VERIFICATION_STATUS.PENDING,
      index: true,
    },

    onlineStatus: {
      type: String,
      enum: Object.values(MARKETPLACE_STORE_ONLINE_STATUS),
      default: MARKETPLACE_STORE_ONLINE_STATUS.OFFLINE,
      index: true,
    },

    onboardingStatus: {
      type: String,
      enum: Object.values(MARKETPLACE_STORE_ONBOARDING_STATUS),
      default: MARKETPLACE_STORE_ONBOARDING_STATUS.NOT_STARTED,
    },

    deliveryRadiusKm: {
      type: Number,
      min: [1, "Delivery radius must be at least 1 KM"],
      max: [100, "Delivery radius cannot exceed 100 KM"],
      default: 5,
    },

    minimumOrderAmount: {
      type: Number,
      min: [0, "Minimum order amount cannot be negative"],
      default: 0,
    },

    estimatedPreparationTimeMinutes: {
      type: Number,
      min: [1, "Preparation time must be at least 1 minute"],
      max: [120, "Preparation time cannot exceed 120 minutes"],
      default: 15,
    },

    autoAcceptOrders: {
      type: Boolean,
      default: false,
    },

    autoRejectTimeoutSeconds: {
      type: Number,
      min: [10, "Auto reject timeout must be at least 10 seconds"],
      max: [600, "Auto reject timeout cannot exceed 600 seconds"],
      default: 60,
    },

    acceptsScheduledOrders: {
      type: Boolean,
      default: false,
    },

    workingHours: {
      type: WORKING_HOURS_SCHEMA,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: Object.values(MARKETPLACE_STORE_STATUS),
      default: MARKETPLACE_STORE_STATUS.INACTIVE,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    suspensionReason: {
      type: String,
      trim: true,
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

marketplaceStoreSchema.pre("validate", async function () {
  if (!this.storeCode) {
    this.storeCode = await generateStoreCode();
  }
});

marketplaceStoreSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.__v;

  return obj;
};

marketplaceStoreSchema.index(
  { storeCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

marketplaceStoreSchema.index(
  { branchId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

marketplaceStoreSchema.index({ workspaceId: 1, isDeleted: 1 });
marketplaceStoreSchema.index({ workspaceId: 1, companyId: 1, isDeleted: 1 });
marketplaceStoreSchema.index({ workspaceId: 1, verificationStatus: 1, isDeleted: 1 });
marketplaceStoreSchema.index({ workspaceId: 1, onlineStatus: 1, isDeleted: 1 });
marketplaceStoreSchema.index({ workspaceId: 1, status: 1, isDeleted: 1 });

const MarketplaceStore =
  mongoose.models.MarketplaceStore ||
  mongoose.model("MarketplaceStore", marketplaceStoreSchema);

export default MarketplaceStore;
