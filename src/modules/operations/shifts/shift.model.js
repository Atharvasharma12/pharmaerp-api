import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    financialPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialPeriod",
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shiftNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    shiftName: {
      type: String,
      trim: true,
      default: "",
    },
    openPeriod: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: null,
    },
    closePeriod: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "closed", "cancelled"],
      default: "open",
      index: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Reference to the branch's system default cash account being reconciled in this shift
    cashAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashAccount",
      default: null,
      index: true,
    },
    openingFloatAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedClosingCashAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualClosingCashAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openingDenominations: [
      {
        denomination: { type: Number },
        count: { type: Number },
        amount: { type: Number },
      }
    ],
    closingDenominations: [
      {
        denomination: { type: Number },
        count: { type: Number },
        amount: { type: Number },
      }
    ],
    cashDifferenceAmount: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // Fund transfer totals — snapshot persisted at shift close
    totalFundWithdrawals: {
      type: Number,
      default: 0,
    },
    totalFundDeposits: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure unique shift per branch per day
shiftSchema.index({ branchId: 1, date: 1, shiftNo: 1 }, { unique: true });

export const Shift = mongoose.model("Shift", shiftSchema);
