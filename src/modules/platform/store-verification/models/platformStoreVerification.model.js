import mongoose from "mongoose";

import {
  STORE_VERIFICATION_STATUS,
  STORE_DOCUMENT_STATUS,
} from "../constants/platformStoreVerification.constant.js";

const DOCUMENT_SCHEMA = new mongoose.Schema(
  {
    value: {
      type: String,
      trim: true,
      default: null,
    },
    documentUrl: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(STORE_DOCUMENT_STATUS),
      default: STORE_DOCUMENT_STATUS.NOT_SUBMITTED,
    },
  },
  { _id: false },
);

const BANK_SCHEMA = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      trim: true,
      default: null,
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    accountHolderName: {
      type: String,
      trim: true,
      default: null,
    },
    bankName: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const platformStoreVerificationSchema = new mongoose.Schema(
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

    marketplaceStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceStore",
      required: [true, "Marketplace store is required"],
      index: true,
    },

    drugLicense: {
      type: DOCUMENT_SCHEMA,
      default: () => ({}),
    },

    gst: {
      type: DOCUMENT_SCHEMA,
      default: () => ({}),
    },

    pan: {
      type: DOCUMENT_SCHEMA,
      default: () => ({}),
    },

    fssai: {
      type: DOCUMENT_SCHEMA,
      default: () => ({}),
    },

    bankDetails: {
      type: BANK_SCHEMA,
      default: () => ({}),
    },

    verificationStatus: {
      type: String,
      enum: Object.values(STORE_VERIFICATION_STATUS),
      default: STORE_VERIFICATION_STATUS.PENDING,
      index: true,
    },

    reviewNotes: {
      type: String,
      trim: true,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
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
  },
  {
    timestamps: true,
  },
);

platformStoreVerificationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.__v;

  return obj;
};

platformStoreVerificationSchema.index(
  { marketplaceStoreId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

platformStoreVerificationSchema.index({
  verificationStatus: 1,
  isDeleted: 1,
});

platformStoreVerificationSchema.index({
  workspaceId: 1,
  verificationStatus: 1,
  isDeleted: 1,
});

const PlatformStoreVerification =
  mongoose.models.PlatformStoreVerification ||
  mongoose.model(
    "PlatformStoreVerification",
    platformStoreVerificationSchema,
  );

export default PlatformStoreVerification;
