import mongoose from "mongoose";

import {
  SUPPLIER_STATUS,
  SUPPLIER_TYPE,
  SUPPLIER_OPENING_BALANCE_TYPE,
  SUPPLIER_CODE_PREFIX,
} from "../constants/supplier.constant.js";

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

const supplierSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },

    supplierCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    supplierType: {
      type: String,
      enum: Object.values(SUPPLIER_TYPE),
      default: SUPPLIER_TYPE.DISTRIBUTOR,
      index: true,
    },

    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      minlength: [2, "Business name must be at least 2 characters"],
      maxlength: [200, "Business name cannot exceed 200 characters"],
    },

    contactPerson: {
      type: String,
      trim: true,
      maxlength: [120, "Contact person cannot exceed 120 characters"],
      default: null,
    },

    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid mobile number"],
      default: null,
    },

    alternateMobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid alternate mobile number"],
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

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/,
        "Invalid GST Number",
      ],
      default: null,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN Number"],
      default: null,
    },

    drugLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    address: {
      type: ADDRESS_SCHEMA,
      default: () => ({}),
    },

    creditDays: {
      type: Number,
      min: [0, "Credit days cannot be negative"],
      default: 0,
    },

    openingBalance: {
      type: Number,
      min: [0, "Opening balance cannot be negative"],
      default: 0,
    },

    openingBalanceType: {
      type: String,
      enum: Object.values(SUPPLIER_OPENING_BALANCE_TYPE),
      default: SUPPLIER_OPENING_BALANCE_TYPE.CR,
    },

    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(SUPPLIER_STATUS),
      default: SUPPLIER_STATUS.ACTIVE,
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

const generateSupplierCode = async () => {
  const Supplier = mongoose.models.Supplier;

  while (true) {
    const code = `${SUPPLIER_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await Supplier.exists({
      supplierCode: code,
      isDeleted: false,
    });

    if (!exists) return code;
  }
};

supplierSchema.pre("validate", async function () {
  if (!this.supplierCode) {
    this.supplierCode = await generateSupplierCode();
  }
});

supplierSchema.methods.toSafeObject = function () {
  const supplier = this.toObject();

  delete supplier.__v;

  return supplier;
};

supplierSchema.index(
  { supplierCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

supplierSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
});

supplierSchema.index({
  workspaceId: 1,
  companyId: 1,
  branchId: 1,
  isDeleted: 1,
});

supplierSchema.index({
  workspaceId: 1,
  companyId: 1,
  supplierType: 1,
  status: 1,
  isDeleted: 1,
});

supplierSchema.index({
  createdBy: 1,
  isDeleted: 1,
});

const Supplier =
  mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);

export default Supplier;
