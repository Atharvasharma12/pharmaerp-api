import mongoose from "mongoose";
import {
  PAYMENT_QR_STATUS,
  PAYMENT_QR_PROVIDER,
} from "../constants/paymentQr.constant.js";

const paymentQrSchema = new mongoose.Schema(
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

    // Linked bank account (UPI VPA is registered against a bank account)
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Bank Account is required"],
      index: true,
    },

    // UPI Virtual Payment Address e.g. store@oksbi, pay@upi
    upiId: {
      type: String,
      required: [true, "UPI ID is required"],
      trim: true,
      lowercase: true,
      maxlength: [100, "UPI ID cannot exceed 100 characters"],
    },

    // Display label / nickname for this QR (e.g. "Main Counter", "Billing Desk")
    label: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, "Label cannot exceed 100 characters"],
    },

    // UPI QR provider / payment gateway
    provider: {
      type: String,
      enum: Object.values(PAYMENT_QR_PROVIDER),
      default: PAYMENT_QR_PROVIDER.OTHER,
      index: true,
    },

    // URL/path to the QR code image (stored in uploads/)
    qrImageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Whether this is the default QR code for the company
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_QR_STATUS),
      default: PAYMENT_QR_STATUS.ACTIVE,
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
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  },
);

paymentQrSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique index: upiId must be unique per company (excluding deleted)
paymentQrSchema.index(
  { companyId: 1, upiId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

paymentQrSchema.index({
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
});

paymentQrSchema.index({
  workspaceId: 1,
  companyId: 1,
  bankAccountId: 1,
  isDeleted: 1,
});

const PaymentQr =
  mongoose.models.PaymentQr ||
  mongoose.model("PaymentQr", paymentQrSchema);

export default PaymentQr;
