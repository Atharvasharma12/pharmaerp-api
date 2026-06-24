import mongoose from "mongoose";
import { CASH_ACCOUNT_STATUS } from "../constants/cashAccount.constant.js";

const cashAccountSchema = new mongoose.Schema(
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

    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      minlength: [2, "Account name must be at least 2 characters"],
      maxlength: [120, "Account name cannot exceed 120 characters"],
    },

    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },

    openingBalance: {
      type: Number,
      min: [0, "Opening balance cannot be negative"],
      default: 0,
    },

    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Ledger account ID is required"],
      index: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(CASH_ACCOUNT_STATUS),
      default: CASH_ACCOUNT_STATUS.ACTIVE,
      index: true,
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

cashAccountSchema.methods.toSafeObject = function () {
  const account = this.toObject();
  delete account.__v;
  return account;
};

// Unique index: accountName must be unique per company (excluding deleted)
cashAccountSchema.index(
  { companyId: 1, accountName: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

cashAccountSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
});

cashAccountSchema.index({
  workspaceId: 1,
  companyId: 1,
  status: 1,
  isDeleted: 1,
});

const CashAccount =
  mongoose.models.CashAccount ||
  mongoose.model("CashAccount", cashAccountSchema);

export default CashAccount;
