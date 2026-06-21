import mongoose from "mongoose";

const journalLineSchema = new mongoose.Schema(
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

    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      required: [true, "Voucher ID is required"],
      index: true,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
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

journalLineSchema.methods.toSafeObject = function () {
  const line = this.toObject();
  delete line.__v;
  return line;
};

// Compound index for quick lookups by voucher
journalLineSchema.index({
  voucherId: 1,
  accountId: 1,
});

const JournalLine =
  mongoose.models.JournalLine ||
  mongoose.model("JournalLine", journalLineSchema);

export default JournalLine;
