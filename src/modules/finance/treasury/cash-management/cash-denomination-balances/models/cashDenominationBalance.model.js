import mongoose from "mongoose";

/**
 * CashDenominationBalance
 * ─────────────────────────────────────────────────────────────────────
 * One document per cash account. Tracks the RUNNING balance of each
 * physical denomination (note type) inside that cash account.
 *
 * Updated atomically inside the same MongoDB session/transaction on
 * every cash movement (opening balance, cash transaction, fund transfer).
 *
 * Example document:
 * {
 *   cashAccountId: ObjectId,
 *   totalBalance: 7000,
 *   denominations: [
 *     { denomination: 500, quantity: 14, subtotal: 7000 }
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

const cashDenominationBalanceSchema = new mongoose.Schema(
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

    cashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      required: [true, "Cash Account is required"],
      index: true,
    },

    // Sum of all denomination subtotals — mirrors the accounting balance
    totalBalance: {
      type: Number,
      default: 0,
      min: [0, "Total balance cannot be negative"],
    },

    // Running per-denomination quantities
    denominations: {
      type: [denominationBalanceLineSchema],
      default: [],
    },

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

cashDenominationBalanceSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// One balance document per cash account per company (unique)
cashDenominationBalanceSchema.index(
  { companyId: 1, cashAccountId: 1 },
  { unique: true },
);

cashDenominationBalanceSchema.index({
  workspaceId: 1,
  companyId: 1,
  cashAccountId: 1,
});

const CashDenominationBalance =
  mongoose.models.CashDenominationBalance ||
  mongoose.model("CashDenominationBalance", cashDenominationBalanceSchema);

export default CashDenominationBalance;
