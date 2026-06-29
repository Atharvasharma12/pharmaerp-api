import mongoose from "mongoose";
import { CASH_DENOMINATION_STATUS } from "../constants/cashDenomination.constant.js";

// Sub-schema for each denomination line (e.g. ₹500 × 10 = ₹5,000)
const denominationLineSchema = new mongoose.Schema(
  {
    denomination: {
      type: Number,
      required: [true, "Denomination value is required"],
      min: [1, "Denomination must be at least ₹1"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    // denomination × quantity — auto-calculated in service, stored for quick query
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }, // no separate _id for sub-docs
);

const cashDenominationSchema = new mongoose.Schema(
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

    // Which cash account / counter this count belongs to
    cashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      required: [true, "Cash Account is required"],
      index: true,
    },

    // Denormalized branch reference — copied from the CashAccount on creation
    // for fast direct filtering without joining through CashAccount
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // Auto-generated count reference: CD-YYYY-NNNNN
    countNumber: {
      type: String,
      required: [true, "Count number is required"],
      trim: true,
    },

    // Date and time the physical count was done
    countDate: {
      type: Date,
      required: [true, "Count date is required"],
      index: true,
    },

    // Array of denomination lines
    denominations: {
      type: [denominationLineSchema],
      default: [],
    },

    // Total computed from all denomination lines
    physicalTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Expected cash balance from the ledger at time of count
    expectedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Difference: physicalTotal - expectedBalance
    // Positive = excess cash, Negative = cash short
    variance: {
      type: Number,
      default: 0,
    },

    // Optional note about the count
    narration: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: Object.values(CASH_DENOMINATION_STATUS),
      default: CASH_DENOMINATION_STATUS.DRAFT,
      index: true,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },

    // If variance was adjusted via journal entry
    adjustmentJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
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
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  },
);

cashDenominationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique count number per company
cashDenominationSchema.index(
  { companyId: 1, countNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

cashDenominationSchema.index({
  workspaceId: 1,
  companyId: 1,
  cashAccountId: 1,
  countDate: -1,
  isDeleted: 1,
});

cashDenominationSchema.index({
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
});

// Branch-level index for fast per-branch denomination queries
cashDenominationSchema.index({
  workspaceId: 1,
  companyId: 1,
  branchId: 1,
  countDate: -1,
  isDeleted: 1,
});

const CashDenomination =
  mongoose.models.CashDenomination ||
  mongoose.model("CashDenomination", cashDenominationSchema);

export default CashDenomination;
