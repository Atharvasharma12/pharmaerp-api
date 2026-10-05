import mongoose from "mongoose";
import { BANK_DEPOSIT_SLIP_STATUS } from "../constants/bankDepositSlip.constant.js";

/**
 * BankDepositSlip — Treasury instrument for physical cash deposit at a bank branch.
 *
 * Lifecycle:
 *   PREPARED  → slip created, cash bagged & deducted from FROZEN cash.
 *               Step-1 journal: BranchCash A/c Cr | Cash-In-Transit A/c Dr
 *
 *   PREPARED (partial withdraw) → Some cash taken back from the bag before deposit.
 *               Journal per withdrawal: Cash-Payments A/c Dr | Cash-In-Transit A/c Cr
 *               Tracked in withdrawals[]. remainingAmount = amount - SUM(withdrawals[].amount)
 *
 *   DEPOSITED → bank confirmed receipt of remainingAmount.
 *               Step-2 journal: Cash-In-Transit A/c Cr | Bank A/c Dr
 *
 *   CANCELLED → voided. Only remainingAmount is returned to FROZEN cash.
 *               Partial-withdraw journals are NOT reversed (cash already exited).
 *               Reversal journal: Cash-In-Transit A/c Cr | BranchCash A/c Dr (remainingAmount only)
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

    // Links this slip to the Business Day it was prepared within.
    // Cannot create a slip without an open Business Day.
    businessDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDay",
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

    // ── Partial Withdrawals ────────────────────────────────────────────────
    // Records each cash withdrawal taken from this slip before deposit/cancel.
    // remainingAmount (computed, never stored) = amount - SUM(withdrawals[].amount)
    // When the slip is cancelled, only remainingAmount is returned to frozen cash.
    withdrawals: {
      type: [
        {
          // Scalar total for this withdrawal — must equal SUM(denominations[].subtotal)
          amount: {
            type: Number,
            required: true,
            min: [0.01, "Withdrawal amount must be greater than zero"],
          },
          // Physical denomination breakdown of the withdrawn cash
          denominations: [
            {
              denomination: { type: Number, required: true },
              quantity:     { type: Number, required: true, min: 0 },
              subtotal:     { type: Number, required: true },
              _id: false,
            },
          ],
          // Journal voucher: Dr Cash-Payments / Cr Cash-In-Transit
          journalVoucherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JournalVoucher",
            default: null,
          },
          withdrawnBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          withdrawnAt: { type: Date, default: Date.now },
          narration:   { type: String, maxlength: 500, default: null },
          _id: false,
        },
      ],
      default: [],
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

// Business Day-linked slip lookup
bankDepositSlipSchema.index({ businessDayId: 1, status: 1, isDeleted: 1 });

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
