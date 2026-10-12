import mongoose from "mongoose";
import { CUSTOMER_TRANSACTION_TYPE } from "../constants/customer.constant.js";

const customerAdvanceTransactionSchema = new mongoose.Schema(
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

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(CUSTOMER_TRANSACTION_TYPE),
      required: [true, "Transaction type is required"],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },

    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      default: 0,
    },

    referenceType: {
      type: String,
      enum: ["INVOICE", "MANUAL", "RECEIPT"],
      default: "RECEIPT",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Advance", "Split", null],
      default: null,
    },

    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    journalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
    },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },

    paymentQrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentQr",
      default: null,
      index: true,
    },

    cashTendered: {
      type: Number,
      default: 0,
      min: 0,
    },

    changeDue: {
      type: Number,
      default: 0,
      min: 0,
    },

    denominations: [
      {
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],

    returnedDenominations: [
      {
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],

    narration: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

customerAdvanceTransactionSchema.index({ customerId: 1, status: 1 });
customerAdvanceTransactionSchema.index({ companyId: 1, workspaceId: 1, type: 1, status: 1 });
customerAdvanceTransactionSchema.index({ referenceId: 1, referenceType: 1 });
customerAdvanceTransactionSchema.index({ createdAt: -1 });

const CustomerAdvanceTransaction =
  mongoose.models.CustomerAdvanceTransaction ||
  mongoose.model("CustomerAdvanceTransaction", customerAdvanceTransactionSchema);

export default CustomerAdvanceTransaction;
