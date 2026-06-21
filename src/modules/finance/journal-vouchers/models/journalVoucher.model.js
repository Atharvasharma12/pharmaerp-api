import mongoose from "mongoose";

import {
  JOURNAL_VOUCHER_TYPE,
  JOURNAL_VOUCHER_STATUS,
} from "../constants/journalVoucher.constant.js";

const journalVoucherSchema = new mongoose.Schema(
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

    voucherNumber: {
      type: String,
      required: [true, "Voucher number is required"],
      trim: true,
    },

    voucherDate: {
      type: Date,
      required: [true, "Voucher date is required"],
    },

    voucherType: {
      type: String,
      enum: Object.values(JOURNAL_VOUCHER_TYPE),
      required: [true, "Voucher type is required"],
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    narration: {
      type: String,
      trim: true,
      default: null,
    },

    totalDebit: {
      type: Number,
      default: 0,
    },

    totalCredit: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: Object.values(JOURNAL_VOUCHER_STATUS),
      default: JOURNAL_VOUCHER_STATUS.DRAFT,
      index: true,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    postedAt: {
      type: Date,
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

journalVoucherSchema.methods.toSafeObject = function () {
  const voucher = this.toObject();
  delete voucher.__v;
  return voucher;
};

// Unique index: voucherNumber must be unique per company
journalVoucherSchema.index(
  { companyId: 1, voucherNumber: 1 },
  {
    unique: true,
  }
);

const JournalVoucher =
  mongoose.models.JournalVoucher ||
  mongoose.model("JournalVoucher", journalVoucherSchema);

export default JournalVoucher;
