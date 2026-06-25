import mongoose from "mongoose";
import { BANK_SLIP_TYPE, BANK_SLIP_STATUS } from "../constants/bankSlip.constant.js";

const bankSlipSchema = new mongoose.Schema(
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

    // Auto-generated slip number: BS-YYYY-NNNNN
    slipNumber: {
      type: String,
      required: [true, "Slip number is required"],
      trim: true,
    },

    // Bank account this slip is for
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Bank Account is required"],
      index: true,
    },

    slipType: {
      type: String,
      enum: Object.values(BANK_SLIP_TYPE),
      required: [true, "Slip type is required"],
      index: true,
    },

    // Physical slip / pay-in slip number from bank
    bankSlipReference: {
      type: String,
      trim: true,
      default: null,
      maxlength: 100,
    },

    slipDate: {
      type: Date,
      required: [true, "Slip date is required"],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },

    narration: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    // Optional: link to the bank transaction created after confirmation
    bankTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransaction",
      default: null,
      index: true,
    },

    // Optional: link to the journal voucher (created on CONFIRMED)
    journalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(BANK_SLIP_STATUS),
      default: BANK_SLIP_STATUS.PENDING,
      index: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: null,
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

bankSlipSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique slip number per company
bankSlipSchema.index(
  { companyId: 1, slipNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

bankSlipSchema.index({ workspaceId: 1, companyId: 1, status: 1, isDeleted: 1 });
bankSlipSchema.index({ workspaceId: 1, companyId: 1, bankAccountId: 1, isDeleted: 1 });
bankSlipSchema.index({ workspaceId: 1, companyId: 1, slipDate: -1, isDeleted: 1 });

const BankSlip =
  mongoose.models.BankSlip ||
  mongoose.model("BankSlip", bankSlipSchema);

export default BankSlip;
