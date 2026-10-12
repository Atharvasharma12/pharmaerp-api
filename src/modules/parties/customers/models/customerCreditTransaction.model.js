import mongoose from "mongoose";
import { CREDIT_STATUS } from "../constants/customer.constant.js";

const settlementEntrySchema = new mongoose.Schema(
  {
    settledAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    settledDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Advance", "Bank", "Other"],
      required: true,
    },
    journalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
    },
    advanceTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAdvanceTransaction",
      default: null,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    paymentQrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentQr",
      default: null,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: true, timestamps: true }
);

const customerCreditTransactionSchema = new mongoose.Schema(
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

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesInvoice",
      required: [true, "Invoice ID is required"],
      index: true,
    },

    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
    },

    invoiceDate: {
      type: Date,
      required: [true, "Invoice date is required"],
      default: Date.now,
    },

    invoiceAmount: {
      type: Number,
      required: [true, "Invoice amount is required"],
      min: [0, "Invoice amount must be positive"],
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceDue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    dueDate: {
      type: Date,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "SETTLED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    settlements: {
      type: [settlementEntrySchema],
      default: [],
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

customerCreditTransactionSchema.index({ customerId: 1, status: 1 });
customerCreditTransactionSchema.index({ companyId: 1, status: 1, dueDate: 1 });
customerCreditTransactionSchema.index({ workspaceId: 1, customerId: 1, status: 1 });
customerCreditTransactionSchema.index({ createdAt: -1 });

const CustomerCreditTransaction =
  mongoose.models.CustomerCreditTransaction ||
  mongoose.model("CustomerCreditTransaction", customerCreditTransactionSchema);

export default CustomerCreditTransaction;
