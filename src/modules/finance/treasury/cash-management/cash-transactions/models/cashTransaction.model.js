import mongoose from "mongoose";
import {
  CASH_TRANSACTION_TYPE,
  CASH_TRANSACTION_DIRECTION,
  CASH_TRANSACTION_STATUS,
} from "../constants/cashTransaction.constant.js";

const cashTransactionSchema = new mongoose.Schema(
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

    transactionNumber: {
      type: String,
      required: [true, "Transaction number is required"],
      trim: true,
    },

    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      index: true,
    },

    // The cash account (physical cash register / petty cash box)
    cashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      required: [true, "Cash Account is required"],
      index: true,
    },

    transactionType: {
      type: String,
      enum: Object.values(CASH_TRANSACTION_TYPE),
      required: [true, "Transaction type is required"],
      index: true,
    },

    direction: {
      type: String,
      enum: Object.values(CASH_TRANSACTION_DIRECTION),
      required: [true, "Transaction direction is required"],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },

    // UTR / Reference / Receipt number
    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    narration: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    // Counter-party account to offset the cash ledger
    counterpartyAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    // Linked journal voucher
    journalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
      index: true,
    },

    // Optional: linked denomination count for this cash movement
    cashDenominationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashDenomination",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(CASH_TRANSACTION_STATUS),
      default: CASH_TRANSACTION_STATUS.DRAFT,
      index: true,
    },

    postedAt: {
      type: Date,
      default: null,
    },

    postedBy: {
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

cashTransactionSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique index: transactionNumber per company
cashTransactionSchema.index(
  { companyId: 1, transactionNumber: 1 },
  { unique: true },
);

cashTransactionSchema.index({
  workspaceId: 1,
  companyId: 1,
  cashAccountId: 1,
  isDeleted: 1,
  transactionDate: -1,
});

cashTransactionSchema.index({
  workspaceId: 1,
  companyId: 1,
  transactionType: 1,
  direction: 1,
  status: 1,
  isDeleted: 1,
});

const CashTransaction =
  mongoose.models.CashTransaction ||
  mongoose.model("CashTransaction", cashTransactionSchema);

export default CashTransaction;
