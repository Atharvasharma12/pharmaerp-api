import mongoose from "mongoose";

const gstLedgerSchema = new mongoose.Schema(
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

    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      // Ref can be Customer or Supplier based on gstType
      required: false,
      index: true,
    },

    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
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

    gstType: {
      type: String,
      enum: ["GSTR-1", "GSTR-2"],
      required: [true, "GST Type (GSTR-1 or GSTR-2) is required"],
      index: true,
    },

    taxableAmount: {
      type: Number,
      default: 0,
    },

    igst: {
      type: Number,
      default: 0,
    },

    cgst: {
      type: Number,
      default: 0,
    },

    sgst: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
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

gstLedgerSchema.methods.toSafeObject = function () {
  const entry = this.toObject();
  delete entry.__v;
  return entry;
};

// Compound index for chronological querying of a company's GST ledger
gstLedgerSchema.index({
  workspaceId: 1,
  companyId: 1,
  gstType: 1,
  voucherDate: 1,
  createdAt: 1,
});

const GstLedger =
  mongoose.models.GstLedger || mongoose.model("GstLedger", gstLedgerSchema);

export default GstLedger;
