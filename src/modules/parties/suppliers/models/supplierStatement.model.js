import mongoose from "mongoose";

const supplierStatementSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  transactionType: { type: String, required: true },
  referenceType: { type: String, required: true },
  reference: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, default: 0 },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

supplierStatementSchema.index({ supplierId: 1, referenceType: 1, description: 1 }, { unique: true });

const SupplierStatement = mongoose.models.SupplierStatement || mongoose.model("SupplierStatement", supplierStatementSchema);
export default SupplierStatement;
