import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
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

    bankMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankMaster",
      required: [true, "Bank Master is required"],
      index: true,
    },

    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: 255,
    },

    accountHolderName: {
      type: String,
      required: [true, "Account holder name is required"],
      trim: true,
      maxlength: 255,
    },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
    },

    ifscCode: {
      type: String,
      required: [true, "IFSC code is required"],
      trim: true,
      uppercase: true,
    },

    branchName: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
    },

    branchAddress: {
      type: String,
      default: null,
      trim: true,
    },

    registeredMobile: {
      type: String,
      default: null,
      trim: true,
    },

    accountType: {
      type: String,
      enum: ["CURRENT", "SAVINGS", "OVERDRAFT", "CASH_CREDIT"],
      default: "CURRENT",
      index: true,
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

    isActive: {
      type: Boolean,
      default: true,
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
  }
);

bankAccountSchema.methods.toSafeObject = function () {
  const account = this.toObject();
  delete account.__v;
  return account;
};

// Unique index: accountNumber must be unique per company (excluding deleted accounts)
bankAccountSchema.index(
  { companyId: 1, accountNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

const BankAccount =
  mongoose.models.BankAccount ||
  mongoose.model("BankAccount", bankAccountSchema);

export default BankAccount;
