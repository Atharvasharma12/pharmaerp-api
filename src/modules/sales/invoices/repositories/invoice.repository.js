import mongoose from "mongoose";
import SalesInvoice from "../models/invoice.model.js";

const createInvoice = async (invoiceData, options = {}) => {
  const invoice = new SalesInvoice(invoiceData);
  return invoice.save({ session: options.session || null });
};

const getLatestInvoiceByPrefix = async (companyId, workspaceId, prefix) => {
  return SalesInvoice.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    invoiceNo: { $regex: `^${prefix}` },
    isDeleted: false,
  })
    .sort({ invoiceNo: -1 })
    .select("invoiceNo")
    .lean();
};


const getInvoicesByCustomerId = async (customerId, companyId, workspaceId, filters = {}, pagination = {}) => {
  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));
  const skip = (page - 1) * limit;

  const query = {
    customerId: new mongoose.Types.ObjectId(customerId),
    companyId: new mongoose.Types.ObjectId(companyId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    isDeleted: false,
  };

  if (filters.branchId) {
    query.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }

  const [invoices, total, aggregate] = await Promise.all([
    SalesInvoice.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    SalesInvoice.countDocuments(query),
    SalesInvoice.aggregate([{ $match: query }, { $group: { _id: null, totalAmount: { $sum: "$grandTotal" } } }]),
  ]);

  const totalSalesAmount = aggregate[0]?.totalAmount || 0;

  return { sales: invoices, total, page, limit, totalSalesAmount };
};

const getAllInvoices = async (companyId, workspaceId, filters = {}, pagination = {}) => {
  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));
  const skip = (page - 1) * limit;

  const query = {
    companyId: new mongoose.Types.ObjectId(companyId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    isDeleted: false,
  };

  if (filters.branchId) {
    query.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }

  const [invoices, total] = await Promise.all([
    SalesInvoice.find(query).populate("customerId", "name mobile alternateMobile").sort({ date: -1 }).skip(skip).limit(limit).lean(),
    SalesInvoice.countDocuments(query),
  ]);

  // Format to match old expectations: add customerName, customerPhone
  const mappedData = invoices.map((inv) => {
    return {
      ...inv,
      customerName: inv.customerId?.name || null,
      customerPhone: inv.customerId?.mobile || inv.customerId?.alternateMobile || null,
      customerId: inv.customerId?._id || inv.customerId,
    };
  });

  return { sales: mappedData, total, page, limit };
};

export default {
  createInvoice,
  getInvoicesByCustomerId,
  getAllInvoices,
  getLatestInvoiceByPrefix,
};
