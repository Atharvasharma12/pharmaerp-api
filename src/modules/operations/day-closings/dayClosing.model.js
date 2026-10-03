import mongoose from "mongoose";

const dayClosingSchema = new mongoose.Schema(
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
    dayClosingNo: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "closed", "cancelled"],
      default: "draft",
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shifts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift",
      },
    ],
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
      },
    ],
    closingDenominations: [
      {
        denomination: { type: Number },
        count: { type: Number },
        amount: { type: Number },
      },
    ],
    totalFundWithdrawals: {
      type: Number,
      default: 0,
    },
    totalFundDeposits: {
      type: Number,
      default: 0,
    },
    cashDifferenceAmount: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Ensure unique day closing per branch per day
dayClosingSchema.index({ branchId: 1, date: 1 }, { unique: true });

export const DayClosing = mongoose.model("DayClosing", dayClosingSchema);
