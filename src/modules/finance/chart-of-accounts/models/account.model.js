import mongoose from "mongoose";

import {
  ACCOUNT_NATURE,
  ACCOUNT_CATEGORY,
  ACCOUNT_OPENING_BALANCE_TYPE,
  ACCOUNT_STATUS,
} from "../constants/account.constant.js";

const accountSchema = new mongoose.Schema(
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

    accountCode: {
      type: String,
      required: [true, "Account code is required"],
      trim: true,
      uppercase: true,
    },

    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      minlength: [2, "Account name must be at least 2 characters"],
      maxlength: [120, "Account name cannot exceed 120 characters"],
    },

    accountGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountGroup",
      required: [true, "Account Group is required"],
      index: true,
    },

    accountNature: {
      type: String,
      required: [true, "Account nature is required"],
      enum: Object.values(ACCOUNT_NATURE),
      index: true,
    },

    accountCategory: {
      type: String,
      required: [true, "Account category is required"],
      enum: Object.values(ACCOUNT_CATEGORY),
      index: true,
    },

    openingBalance: {
      type: Number,
      min: [0, "Opening balance cannot be negative"],
      default: 0,
    },

    openingBalanceType: {
      type: String,
      enum: Object.values(ACCOUNT_OPENING_BALANCE_TYPE),
      default: ACCOUNT_OPENING_BALANCE_TYPE.DR,
    },

    isSystemAccount: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
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
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accountSchema.methods.toSafeObject = function () {
  const account = this.toObject();
  delete account.__v;
  return account;
};

// Unique index: accountCode must be unique per company
accountSchema.index(
  { companyId: 1, accountCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Unique index: accountName must be unique per company
accountSchema.index(
  { companyId: 1, accountName: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

accountSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
});

accountSchema.index({
  workspaceId: 1,
  companyId: 1,
  accountGroupId: 1,
  isDeleted: 1,
});

accountSchema.index({
  workspaceId: 1,
  companyId: 1,
  accountNature: 1,
  isDeleted: 1,
});

accountSchema.index({
  workspaceId: 1,
  companyId: 1,
  accountCategory: 1,
  status: 1,
  isDeleted: 1,
});

const Account =
  mongoose.models.Account || mongoose.model("Account", accountSchema);

export default Account;
