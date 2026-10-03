import mongoose from "mongoose";
import { CHEQUE_TYPE, CHEQUE_STATUS } from "../constants/cheque.constant.js";

const chequeSchema = new mongoose.Schema(
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

    // RECEIVED = customer gave us a cheque | ISSUED = we gave a cheque to vendor
    chequeType: {
      type: String,
      enum: Object.values(CHEQUE_TYPE),
      required: [true, "Cheque type is required"],
      index: true,
    },

    // Cheque number printed on the cheque
    chequeNumber: {
      type: String,
      required: [true, "Cheque number is required"],
      trim: true,
      uppercase: true,
    },

    // Date printed on the cheque (may be post-dated)
    chequeDate: {
      type: Date,
      required: [true, "Cheque date is required"],
      index: true,
    },

    // Bank account this cheque is drawn on (ISSUED) or deposited into (RECEIVED)
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Bank Account is required"],
      index: true,
    },

    // The party account — customer/vendor counterparty ledger
    counterpartyAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Counterparty account is required"],
      index: true,
    },

    // Name of the party on the cheque (drawer or payee)
    partyName: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
      maxlength: [200, "Party name cannot exceed 200 characters"],
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

    status: {
      type: String,
      enum: Object.values(CHEQUE_STATUS),
      default: CHEQUE_STATUS.PENDING,
      index: true,
    },

    // Date cheque was deposited into bank
    depositedAt: {
      type: Date,
      default: null,
    },

    depositedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Date cheque was cleared by the bank
    clearedAt: {
      type: Date,
      default: null,
    },

    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Date cheque bounced
    bouncedAt: {
      type: Date,
      default: null,
    },

    bouncedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    bounceReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    // Bounce charges (if any) — auto-creates expense entry
    bounceCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Date cheque was cancelled
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

    // Journal vouchers created at each stage
    pendingJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
    },

    clearingJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
      default: null,
    },

    bounceJournalVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalVoucher",
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

chequeSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Unique: chequeNumber per company (excluding deleted)
chequeSchema.index(
  { companyId: 1, chequeNumber: 1, chequeType: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

chequeSchema.index({ workspaceId: 1, companyId: 1, status: 1, isDeleted: 1 });
chequeSchema.index({ workspaceId: 1, companyId: 1, bankAccountId: 1, isDeleted: 1 });
chequeSchema.index({ workspaceId: 1, companyId: 1, chequeType: 1, isDeleted: 1 });

const Cheque =
  mongoose.models.Cheque ||
  mongoose.model("Cheque", chequeSchema);

export default Cheque;
