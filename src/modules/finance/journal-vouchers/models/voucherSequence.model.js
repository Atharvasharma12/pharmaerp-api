import mongoose from "mongoose";

const voucherSequenceSchema = new mongoose.Schema(
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
    voucherType: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    nextSequence: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

voucherSequenceSchema.index(
  { companyId: 1, voucherType: 1, year: 1 },
  { unique: true }
);

const VoucherSequence =
  mongoose.models.VoucherSequence ||
  mongoose.model("VoucherSequence", voucherSequenceSchema);

export default VoucherSequence;
