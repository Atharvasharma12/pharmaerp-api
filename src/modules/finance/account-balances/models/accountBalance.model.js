import mongoose from "mongoose";

import { ACCOUNT_BALANCE_TYPE } from "../constants/accountBalance.constant.js";

const accountBalanceSchema = new mongoose.Schema(
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

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
      index: true,
    },

    debitTotal: {
      type: Number,
      min: [0, "Debit total cannot be negative"],
      default: 0,
    },

    creditTotal: {
      type: Number,
      min: [0, "Credit total cannot be negative"],
      default: 0,
    },

    balance: {
      type: Number,
      min: [0, "Balance cannot be negative"],
      default: 0,
    },

    balanceType: {
      type: String,
      enum: Object.values(ACCOUNT_BALANCE_TYPE),
      default: ACCOUNT_BALANCE_TYPE.DR,
      index: true,
    },

    lastTransactionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accountBalanceSchema.pre("save", function (next) {
  const debit = this.debitTotal || 0;
  const credit = this.creditTotal || 0;
  if (debit >= credit) {
    this.balance = debit - credit;
    this.balanceType = ACCOUNT_BALANCE_TYPE.DR;
  } else {
    this.balance = credit - debit;
    this.balanceType = ACCOUNT_BALANCE_TYPE.CR;
  }
  next();
});

accountBalanceSchema.methods.toSafeObject = function () {
  const balanceObj = this.toObject();
  delete balanceObj.__v;
  return balanceObj;
};


// Unique index: accountId must be unique
accountBalanceSchema.index(
  { accountId: 1 },
  {
    unique: true,
  }
);

accountBalanceSchema.index({
  workspaceId: 1,
  companyId: 1,
});

accountBalanceSchema.index({
  workspaceId: 1,
  companyId: 1,
  balanceType: 1,
});

const AccountBalance =
  mongoose.models.AccountBalance ||
  mongoose.model("AccountBalance", accountBalanceSchema);

export default AccountBalance;
