import mongoose from "mongoose";

/**
 * BranchCashBalance
 * ─────────────────────────────────────────────────────────────────────────────
 * One document per branch. Tracks the RUNNING denomination breakdown of each
 * cash partition (running vs frozen).
 *
 * Mirrors the monetary totals in BranchCash but at denomination granularity.
 * Updated atomically (same transaction) on every cash movement.
 *
 * Example document:
 * {
 *   branchId: ObjectId,
 *   runningTotal: 2000,
 *   runningDenominations: [
 *     { denomination: 500, quantity: 3, subtotal: 1500 },
 *     { denomination: 100, quantity: 5, subtotal: 500 },
 *   ],
 *   frozenTotal: 13000,
 *   frozenDenominations: [
 *     { denomination: 500, quantity: 26, subtotal: 13000 },
 *   ]
 * }
 */

const denominationBalanceLineSchema = new mongoose.Schema(
  {
    denomination: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false },
);

const branchCashBalanceSchema = new mongoose.Schema(
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
      required: [true, "Branch is required"],
      index: true,
    },

    // ── Running Partition ─────────────────────────────────────────────────
    runningTotal: {
      type: Number,
      default: 0,
      min: [0, "Running total cannot be negative"],
    },
    runningDenominations: {
      type: [denominationBalanceLineSchema],
      default: [],
    },

    // ── Frozen Partition ──────────────────────────────────────────────────
    frozenTotal: {
      type: Number,
      default: 0,
      min: [0, "Frozen total cannot be negative"],
    },
    frozenDenominations: {
      type: [denominationBalanceLineSchema],
      default: [],
    },

    // ── Frozen Ledger (audit timeline) ───────────────────────────────────
    // Every time frozen cash changes (shift close freeze, withdrawal, bank slip)
    // a lightweight entry is appended. Used by day-closing to show the timeline
    // of frozen-cash movements for a given date.
    frozenLedger: [
      {
        // "freeze"          = running → frozen at shift close
        // "withdrawal"      = frozen → external cash out
        // "deposit_to_slip" = frozen → bank deposit slip
        action: {
          type: String,
          enum: ["freeze", "withdrawal", "deposit_to_slip"],
          required: true,
        },
        amount: { type: Number, required: true },
        note: { type: String, default: "" },
        shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", default: null },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        date: { type: Date, default: Date.now },
      },
    ],

    lastUpdatedAt: {
      type: Date,
      default: null,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

branchCashBalanceSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// One balance document per branch per company (unique)
branchCashBalanceSchema.index(
  { companyId: 1, branchId: 1 },
  { unique: true },
);

branchCashBalanceSchema.index({
  workspaceId: 1,
  companyId: 1,
  branchId: 1,
});

const BranchCashBalance =
  mongoose.models.BranchCashBalance ||
  mongoose.model("BranchCashBalance", branchCashBalanceSchema);

export default BranchCashBalance;
