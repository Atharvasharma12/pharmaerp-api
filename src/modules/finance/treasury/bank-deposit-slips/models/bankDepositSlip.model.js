import mongoose from "mongoose";
import { BANK_DEPOSIT_SLIP_STATUS } from "../constants/bankDepositSlip.constant.js";

/**
 * BankDepositSlip — Treasury instrument for physical cash deposit at a bank branch.
 *
 * Lifecycle:
 *   PREPARED  → slip created, cash bagged & deducted from cash account.
 *               Step 1 journal: Cash A/c Cr | Cash In Transit A/c Dr
 *   DEPOSITED → bank confirmed receipt.
 *               Step 2 journal: Cash In Transit A/c Cr | Bank A/c Dr
 *   CANCELLED → voided, both journals reversed, denominations returned.
 *
 * This is distinct from a Fund Transfer: the two-step journal correctly models
 * the transit period (cash has left the counter but not yet cleared the bank).
 */
const bankDepositSlipSchema = new mongoose.Schema(
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

    // Source: always the branch's FROZEN cash reserve
    // (no cash account selection needed — each branch has exactly one frozen reserve)
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
      index: true,
    },

    // Optional: links this slip to the day closing it was prepared within
    dayClosingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DayClosing",
      default: null,
      index: true,
    },

    // Auto-generated identifier: BDS-YYYY-NNNNN
    slipNumber: {
      type: String,
      required: [true, "Slip number is required"],
      trim: true,
    },

    // Date the cash was counted and the slip was prepared (typically shift close date)
    slipDate: {
      type: Date,
      required: [true, "Slip date is required"],
      index: true,
    },

    // DEPRECATED: fromCashAccountId — kept for backward compat with existing records only
    // ref intentionally removed: CashAccount model was deleted in treasury refactor
    fromCashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    // Destination: the company bank account the cash will be deposited into
    toBankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Destination bank account is required"],
      index: true,
    },

    // Total cash amount being deposited
    amount: {
      type: Number,
      required: [true, "Deposit amount is required"],
      min: [0.01, "Deposit amount must be greater than zero"],
    },

    // ── Transit metadata (the "bank slip" fields) ──────────────────────────

    // Physical bag / envelope number written on the bag handed to the bank
    depositBagReference: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, "Bag reference cannot exceed 100 characters"],
    },

    // Free-text: e.g. "HDFC Bank, MG Road Branch" — no master lookup needed in v1
    bankBranchName: {
      type: String,
      trim: true,
      default: null,
      maxlength: [200, "Bank branch name cannot exceed 200 characters"],
    },


    // ── Denomination snapshot ──────────────────────────────────────────────

    // Linked CashDenomination record — the breakdown of notes in the deposit bag
    cashDenominationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashDenomination",
      default: null,
      index: true,
    },

    // ── Status lifecycle ───────────────────────────────────────────────────

    status: {
      type: String,
      enum: Object.values(BANK_DEPOSIT_SLIP_STATUS),
      default: BANK_DEPOSIT_SLIP_STATUS.PREPARED,
      index: true,
    },

    // ── Journal voucher links ──────────────────────────────────────────────

    // Step 1 journal: Cash A/c Cr → Cash In Transit A/c Dr (posted at PREPARED)
    preparationJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
      index: true,
    },

    // Step 2 journal: Cash In Transit A/c Cr → Bank A/c Dr (posted at DEPOSITED)
    depositJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
      index: true,
    },

    // ── Deposit confirmation fields (populated when DEPOSITED) ─────────────

    depositedAt: {
      type: Date,
      default: null,
    },

    depositedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // UTR / bank-issued slip number / reference from bank receipt
    bankReferenceNumber: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, "Bank reference number cannot exceed 100 characters"],
    },

    // Actual date the bank processed the deposit (may differ from slipDate)
    depositConfirmedDate: {
      type: Date,
      default: null,
    },

    // ── Cancellation fields ────────────────────────────────────────────────

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
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    },

    // ── General ────────────────────────────────────────────────────────────

    narration: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, "Narration cannot exceed 500 characters"],
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

bankDepositSlipSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique index: slipNumber per company
bankDepositSlipSchema.index(
  { companyId: 1, slipNumber: 1 },
  { unique: true },
);

// Primary query pattern: workspace + company + date (descending)
bankDepositSlipSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
  slipDate: -1,
});

// Status-based filtering (e.g. "all PREPARED slips pending deposit")
bankDepositSlipSchema.index({
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
});

// Day closing-linked slip lookup
bankDepositSlipSchema.index({ dayClosingId: 1, status: 1, isDeleted: 1 });

// Branch-level reporting
bankDepositSlipSchema.index({
  branchId: 1,
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
  slipDate: -1,
});

const BankDepositSlip =
  mongoose.models.BankDepositSlip ||
  mongoose.model("BankDepositSlip", bankDepositSlipSchema);

export default BankDepositSlip;
