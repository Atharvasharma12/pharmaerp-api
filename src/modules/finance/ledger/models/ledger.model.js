import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
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

    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      required: [true, "Voucher ID is required"],
      index: true,
    },

    voucherNumber: {
      type: String,
      required: [true, "Voucher number is required"],
      trim: true,
    },

    voucherDate: {
      type: Date,
      required: [true, "Voucher date is required"],
      index: true,
    },

    debit: {
      type: Number,
      min: [0, "Debit cannot be negative"],
      default: 0,
    },

    credit: {
      type: Number,
      min: [0, "Credit cannot be negative"],
      default: 0,
    },

    runningBalance: {
      type: Number,
      required: [true, "Running balance is required"],
      default: 0,
    },

    narration: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ledgerSchema.methods.toSafeObject = function () {
  const entry = this.toObject();
  delete entry.__v;
  return entry;
};

// Compound index for chronological querying of an account's ledger
ledgerSchema.index({
  workspaceId: 1,
  companyId: 1,
  accountId: 1,
  voucherDate: 1,
  createdAt: 1,
});

// Index to easily delete/lookup entries by voucher
ledgerSchema.index({
  voucherId: 1,
});

const Ledger =
  mongoose.models.Ledger || mongoose.model("Ledger", ledgerSchema);

export default Ledger;
