import mongoose from "mongoose";

import {
  COMPANY_STATUS,
  COMPANY_TYPE,
  COMPANY_LICENSE_STATUS,
  COMPANY_GST_TYPE,
  DEFAULT_COMPANY_SETTINGS,
  COMPANY_CODE_PREFIX,
} from "../constants/company.constant.js";

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
    district: {
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

const PHONE_SCHEMA = new mongoose.Schema(
  {
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid mobile number"],
      default: null,
    },
    whatsapp: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid WhatsApp number"],
      default: null,
    },
    landline: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false },
);

const PERSON_SCHEMA = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      default: null,
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid mobile number"],
      default: null,
    },
    aadhaar: {
      type: String,
      trim: true,
      match: [/^[0-9]{12}$/, "Invalid Aadhaar number"],
      default: null,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number"],
      default: null,
    },
  },
  { _id: false },
);

const PHARMACIST_SCHEMA = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid pharmacist mobile number"],
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid pharmacist email"],
      default: null,
    },
    registrationExpiryDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const LICENSE_SCHEMA = new mongoose.Schema(
  {
    licenseType: {
      type: String,
      trim: true,
      default: null,
    },
    retailLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    wholesaleLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    drugLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    fssaiNumber: {
      type: String,
      trim: true,
      default: null,
    },
    issuedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(COMPANY_LICENSE_STATUS),
      default: COMPANY_LICENSE_STATUS.PENDING,
    },
    document: {
      type: IMAGE_SCHEMA,
      default: null,
    },
  },
  { _id: false },
);

const TAX_SETTINGS_SCHEMA = new mongoose.Schema(
  {
    gstType: {
      type: String,
      enum: Object.values(COMPANY_GST_TYPE),
      default: COMPANY_GST_TYPE.REGULAR,
    },
    gstJurisdiction: {
      type: String,
      trim: true,
      default: null,
    },
    defaultGstRate: {
      type: Number,
      default: DEFAULT_COMPANY_SETTINGS.defaultGstRate,
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100"],
    },
    isGstInclusive: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const BILLING_SETTINGS_SCHEMA = new mongoose.Schema(
  {
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
    creditNotePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "CRN",
    },
    debitNotePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "DBN",
    },
    barcodeFormat: {
      type: String,
      trim: true,
      default: "Code128",
    },
    roundingType: {
      type: String,
      trim: true,
      default: "2 Decimal Places",
    },
    printCompanyLogoOnInvoice: {
      type: Boolean,
      default: true,
    },
    footerMessage: {
      type: String,
      trim: true,
      maxlength: [300, "Footer message cannot exceed 300 characters"],
      default: null,
    },
  },
  { _id: false },
);

const BUSINESS_SETTINGS_SCHEMA = new mongoose.Schema(
  {
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },
    enableBatchWiseInventory: {
      type: Boolean,
      default: true,
    },
    enableExpiryTracking: {
      type: Boolean,
      default: true,
    },
    enableScheduleHTracking: {
      type: Boolean,
      default: true,
    },
    enableNarcoticDrugTracking: {
      type: Boolean,
      default: true,
    },
    enableSmsNotifications: {
      type: Boolean,
      default: true,
    },
    enableWhatsappNotifications: {
      type: Boolean,
      default: true,
    },
    enableEmailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const SETTINGS_SCHEMA = new mongoose.Schema(
  {
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: DEFAULT_COMPANY_SETTINGS.currency,
    },
    timezone: {
      type: String,
      trim: true,
      default: DEFAULT_COMPANY_SETTINGS.timezone,
    },
    dateFormat: {
      type: String,
      trim: true,
      default: DEFAULT_COMPANY_SETTINGS.dateFormat,
    },
    timeFormat: {
      type: String,
      trim: true,
      default: DEFAULT_COMPANY_SETTINGS.timeFormat,
    },
  },
  { _id: false },
);

const companySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    companyCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [160, "Company name cannot exceed 160 characters"],
    },

    slug: {
      type: String,
      required: [true, "Company slug is required"],
      trim: true,
      lowercase: true,
      maxlength: [180, "Company slug cannot exceed 180 characters"],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Company slug can only contain lowercase letters, numbers and hyphens",
      ],
    },

    type: {
      type: String,
      enum: Object.values(COMPANY_TYPE),
      default: COMPANY_TYPE.PROPRIETORSHIP,
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

    phones: {
      type: PHONE_SCHEMA,
      default: () => ({}),
    },

    website: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [250, "Website cannot exceed 250 characters"],
      default: null,
    },

    address: {
      type: ADDRESS_SCHEMA,
      default: () => ({}),
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

    pan: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number"],
      default: null,
    },

    owner: {
      type: PERSON_SCHEMA,
      default: () => ({}),
    },

    pharmacist: {
      type: PHARMACIST_SCHEMA,
      default: () => ({}),
    },

    license: {
      type: LICENSE_SCHEMA,
      default: () => ({}),
    },

    taxSettings: {
      type: TAX_SETTINGS_SCHEMA,
      default: () => ({}),
    },

    billingSettings: {
      type: BILLING_SETTINGS_SCHEMA,
      default: () => ({}),
    },

    businessSettings: {
      type: BUSINESS_SETTINGS_SCHEMA,
      default: () => ({}),
    },

    settings: {
      type: SETTINGS_SCHEMA,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: Object.values(COMPANY_STATUS),
      default: COMPANY_STATUS.ACTIVE,
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

const generateCompanyCode = async () => {
  const Company = mongoose.models.Company;

  while (true) {
    const code = `${COMPANY_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await Company.exists({
      companyCode: code,
      isDeleted: false,
    });

    if (!exists) return code;
  }
};

companySchema.pre("validate", async function () {
  if (!this.companyCode) {
    this.companyCode = await generateCompanyCode();
  }

  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

companySchema.methods.toSafeObject = function () {
  const company = this.toObject();

  delete company.__v;

  return company;
};

companySchema.index(
  { companyCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

companySchema.index(
  { workspaceId: 1, slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

companySchema.index(
  { workspaceId: 1, gstin: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      gstin: { $type: "string" },
    },
  },
);

companySchema.index({ workspaceId: 1, isDeleted: 1 });
companySchema.index({ workspaceId: 1, status: 1, isDeleted: 1 });
companySchema.index({ createdBy: 1, isDeleted: 1 });

const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

export default Company;
