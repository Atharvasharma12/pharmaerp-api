import mongoose from "mongoose";
import {
  FUND_TRANSFER_TYPE,
  FUND_TRANSFER_STATUS,
} from "../constants/fundTransfer.constant.js";

const fundTransferSchema = new mongoose.Schema(
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

    // Optional: links this transfer to the shift it was performed within
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },

    // Optional: links this transfer to the day closing it was performed within
    dayClosingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DayClosing",
    },
    businessDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDay",
      default: null,
      index: true,
    },

    transferNumber: {
      type: String,
      required: [true, "Transfer number is required"],
      trim: true,
    },

    transferDate: {
      type: Date,
      required: [true, "Transfer date is required"],
      index: true,
    },

    transferType: {
      type: String,
      enum: Object.values(FUND_TRANSFER_TYPE),
      required: [true, "Transfer type is required"],
      index: true,
    },

    // Source account — only bank accounts (cash-to-bank now via BankDepositSlip)
    fromAccountType: {
      type: String,
      enum: ["BANK"],
      required: [true, "Source account type is required"],
    },

    fromBankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
      index: true,
    },


    // Destination account — BANK only (BANK_TO_CASH: bank replenishes running cash)
    toAccountType: {
      type: String,
      enum: ["BANK", "CASH"],
      required: [true, "Destination account type is required"],
    },

    toBankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
      index: true,
    },


    amount: {
      type: Number,
      required: [true, "Transfer amount is required"],
      min: [0.01, "Transfer amount must be greater than zero"],
    },

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

    // Linked journal voucher (CONTRA type)
    journalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
      index: true,
    },

    // Optional: denomination count for the FROM cash account (populated when fromAccountType=CASH)
    fromCashDenominationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashDenomination",
      default: null,
      index: true,
    },

    // Optional: denomination count for the TO cash account (populated when toAccountType=CASH)
    toCashDenominationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashDenomination",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(FUND_TRANSFER_STATUS),
      default: FUND_TRANSFER_STATUS.DRAFT,
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

fundTransferSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique index: transferNumber per company
fundTransferSchema.index(
  { companyId: 1, transferNumber: 1 },
  { unique: true },
);

fundTransferSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
  transferDate: -1,
});

fundTransferSchema.index({
  workspaceId: 1,
  companyId: 1,
  transferType: 1,
  status: 1,
  isDeleted: 1,
});

// Shift-linked transfer lookup (used by shift summary)
fundTransferSchema.index({ shiftId: 1, status: 1, isDeleted: 1 });

// Day closing-linked transfer lookup (used by day closing summary)
fundTransferSchema.index({ dayClosingId: 1, status: 1, isDeleted: 1 });
fundTransferSchema.index({ businessDayId: 1, status: 1, isDeleted: 1 });

// Branch-level fund transfer reporting
fundTransferSchema.index({ branchId: 1, workspaceId: 1, companyId: 1, status: 1, isDeleted: 1, transferDate: -1 });

const FundTransfer =
  mongoose.models.FundTransfer ||
  mongoose.model("FundTransfer", fundTransferSchema);

export default FundTransfer;
