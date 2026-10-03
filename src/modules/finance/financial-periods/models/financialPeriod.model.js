import mongoose from "mongoose";

import { PERIOD_TYPE, PERIOD_STATUS } from "../constants/financialPeriod.constant.js";

const financialPeriodSchema = new mongoose.Schema(
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

    periodCode: {
      type: String,
      required: [true, "Period code is required"],
      trim: true,
      uppercase: true,
    },

    periodType: {
      type: String,
      enum: Object.values(PERIOD_TYPE),
      required: [true, "Period type is required"],
      index: true,
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    isCurrent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(PERIOD_STATUS),
      default: PERIOD_STATUS.OPEN,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

financialPeriodSchema.methods.toSafeObject = function () {
  const period = this.toObject();
  delete period.__v;
  return period;
};

// Unique index: periodCode must be unique per company
financialPeriodSchema.index(
  { companyId: 1, periodCode: 1 },
  {
    unique: true,
  }
);

// Index for overlaps and sorting
financialPeriodSchema.index({
  companyId: 1,
  periodType: 1,
  startDate: 1,
  endDate: 1,
});

const FinancialPeriod =
  mongoose.models.FinancialPeriod ||
  mongoose.model("FinancialPeriod", financialPeriodSchema);

export default FinancialPeriod;
