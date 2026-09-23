import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
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
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    financialPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialPeriod",
      default: null,
    },
    invoiceNo: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    billingMode: {
      type: String,
      default: "B2C",
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    cashTendered: {
      type: Number,
      default: 0,
    },
    changeDue: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    status: {
      type: String,
      default: "Paid",
    },
    items: {
      type: Array,
      default: [],
    },
    doctor: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdByName: {
      type: String,
      default: null,
    },
    createdByEmail: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ companyId: 1, workspaceId: 1, date: -1 });

const SalesInvoice = mongoose.model("SalesInvoice", invoiceSchema);

export default SalesInvoice;
