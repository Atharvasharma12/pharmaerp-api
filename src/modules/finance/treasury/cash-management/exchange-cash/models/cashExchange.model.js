import mongoose from "mongoose";
import { CASH_EXCHANGE_STATUS } from "../constants/cashExchange.constant.js";

const denominationSubSchema = new mongoose.Schema(
  {
    denomination: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const cashExchangeSchema = new mongoose.Schema(
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

    // Auto-linked to the currently open shift (if any)
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },

    // Sequential exchange number: EX-YYYY-NNNNN
    exchangeNumber: {
      type: String,
      required: [true, "Exchange number is required"],
      trim: true,
    },

    exchangeDate: {
      type: Date,
      required: [true, "Exchange date is required"],
      index: true,
    },

    // Which partition the denomination swap occurs in (running or frozen)
    cashPartition: {
      type: String,
      enum: ["running", "frozen"],
      required: [true, "Cash partition is required"],
      index: true,
    },


    // Denominations received FROM the customer (e.g. one ₹500 note)
    denominationsReceived: {
      type: [denominationSubSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one denomination must be received",
      },
    },

    // Computed total of denominationsReceived
    totalReceived: {
      type: Number,
      required: [true, "Total received is required"],
      min: [0.01, "Total received must be greater than zero"],
    },

    // Denominations given OUT to the customer (e.g. five ₹100 notes)
    denominationsGiven: {
      type: [denominationSubSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one denomination must be given",
      },
    },

    // Computed total of denominationsGiven — MUST equal totalReceived
    totalGiven: {
      type: Number,
      required: [true, "Total given is required"],
      min: [0.01, "Total given must be greater than zero"],
    },

    // Optional free-text note visible to cashier
    narration: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    // Optional internal notes (e.g. "Checked for counterfeit")
    notes: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: Object.values(CASH_EXCHANGE_STATUS),
      default: CASH_EXCHANGE_STATUS.COMPLETED,
      index: true,
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

cashExchangeSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique exchangeNumber per company
cashExchangeSchema.index(
  { companyId: 1, exchangeNumber: 1 },
  { unique: true },
);

// List queries: workspace + company + date descending
cashExchangeSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
  exchangeDate: -1,
});


// Shift-linked exchange lookup (used by shift summary)
cashExchangeSchema.index({ shiftId: 1, status: 1, isDeleted: 1 });

// Branch-level reporting
cashExchangeSchema.index({
  branchId: 1,
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
  exchangeDate: -1,
});

const CashExchange =
  mongoose.models.CashExchange ||
  mongoose.model("CashExchange", cashExchangeSchema);

export default CashExchange;
