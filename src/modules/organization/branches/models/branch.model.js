import mongoose from "mongoose";

import {
  BRANCH_STATUS,
  BRANCH_TYPE,
  BRANCH_CODE_PREFIX,
  DEFAULT_BRANCH_SETTINGS,
  BRANCH_BILLING_TYPE,
  BRANCH_INVENTORY_MODE,
  BRANCH_PRICE_MODE,
} from "../constants/branch.constant.js";

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

const CONTACT_PERSON_SCHEMA = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid phone number"],
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
    designation: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const BILLING_SETTINGS_SCHEMA = new mongoose.Schema(
  {
    billingType: {
      type: String,
      enum: Object.values(BRANCH_BILLING_TYPE),
      default: BRANCH_BILLING_TYPE.GST,
    },
    invoicePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INV",
    },
    invoiceStartNumber: {
      type: Number,
      default: 1,
      min: [1, "Invoice start number must be at least 1"],
    },
    billPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "BILL",
    },
    billStartNumber: {
      type: Number,
      default: 1,
      min: [1, "Bill start number must be at least 1"],
    },
    purchasePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "PUR",
    },
    purchaseStartNumber: {
      type: Number,
      default: 1,
      min: [1, "Purchase start number must be at least 1"],
    },
    salesReturnPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "SR",
    },
    purchaseReturnPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "PR",
    },
  },
  { _id: false },
);

const INVENTORY_SETTINGS_SCHEMA = new mongoose.Schema(
  {
    inventoryMode: {
      type: String,
      enum: Object.values(BRANCH_INVENTORY_MODE),
      default: BRANCH_INVENTORY_MODE.INDEPENDENT,
    },
    priceMode: {
      type: String,
      enum: Object.values(BRANCH_PRICE_MODE),
      default: BRANCH_PRICE_MODE.COMPANY_DEFAULT,
    },
    allowNegativeStock: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.allowNegativeStock,
    },
    allowBackdatedEntries: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.allowBackdatedEntries,
    },
    enableBatchTracking: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enableBatchTracking,
    },
    enableExpiryTracking: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enableExpiryTracking,
    },
    enableRackTracking: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enableRackTracking,
    },
  },
  { _id: false },
);

const SETTINGS_SCHEMA = new mongoose.Schema(
  {
    timezone: {
      type: String,
      trim: true,
      default: DEFAULT_BRANCH_SETTINGS.timezone,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: DEFAULT_BRANCH_SETTINGS.currency,
    },
    dateFormat: {
      type: String,
      trim: true,
      default: DEFAULT_BRANCH_SETTINGS.dateFormat,
    },
    timeFormat: {
      type: String,
      trim: true,
      default: DEFAULT_BRANCH_SETTINGS.timeFormat,
    },
    enablePurchaseModule: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enablePurchaseModule,
    },
    enableSalesModule: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enableSalesModule,
    },
    enableInventoryModule: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enableInventoryModule,
    },
    enablePosBilling: {
      type: Boolean,
      default: DEFAULT_BRANCH_SETTINGS.enablePosBilling,
    },
    defaultGstRate: {
      type: Number,
      default: DEFAULT_BRANCH_SETTINGS.defaultGstRate,
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100"],
    },
  },
  { _id: false },
);

const branchSchema = new mongoose.Schema(
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

    branchCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      minlength: [2, "Branch name must be at least 2 characters"],
      maxlength: [160, "Branch name cannot exceed 160 characters"],
    },

    slug: {
      type: String,
      required: [true, "Branch slug is required"],
      trim: true,
      lowercase: true,
      maxlength: [180, "Branch slug cannot exceed 180 characters"],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Branch slug can only contain lowercase letters, numbers and hyphens",
      ],
    },

    type: {
      type: String,
      enum: Object.values(BRANCH_TYPE),
      default: BRANCH_TYPE.RETAIL,
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

    contactPerson: {
      type: CONTACT_PERSON_SCHEMA,
      default: null,
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
        "Invalid GSTIN",
      ],
      default: null,
    },

    drugLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    billingSettings: {
      type: BILLING_SETTINGS_SCHEMA,
      default: () => ({}),
    },

    inventorySettings: {
      type: INVENTORY_SETTINGS_SCHEMA,
      default: () => ({}),
    },

    settings: {
      type: SETTINGS_SCHEMA,
      default: () => DEFAULT_BRANCH_SETTINGS,
    },

    status: {
      type: String,
      enum: Object.values(BRANCH_STATUS),
      default: BRANCH_STATUS.ACTIVE,
      index: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
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

const generateBranchCode = async () => {
  const Branch = mongoose.models.Branch;

  while (true) {
    const code = `${BRANCH_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await Branch.exists({
      branchCode: code,
      isDeleted: false,
    });

    if (!exists) return code;
  }
};

branchSchema.pre("validate", async function () {
  if (!this.branchCode) {
    this.branchCode = await generateBranchCode();
  }

  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

branchSchema.methods.toSafeObject = function () {
  const branch = this.toObject();

  delete branch.__v;

  return branch;
};

branchSchema.index(
  {
    branchCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

branchSchema.index(
  {
    workspaceId: 1,
    companyId: 1,
    slug: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

branchSchema.index({ workspaceId: 1, isDeleted: 1 });
branchSchema.index({ companyId: 1, isDeleted: 1 });
branchSchema.index({ workspaceId: 1, companyId: 1, isDeleted: 1 });
branchSchema.index({ workspaceId: 1, companyId: 1, status: 1, isDeleted: 1 });
branchSchema.index({ createdBy: 1, isDeleted: 1 });

const Branch = mongoose.models.Branch || mongoose.model("Branch", branchSchema);

export default Branch;
