import mongoose from "mongoose";
import CashTransaction from "../models/cashTransaction.model.js";

const POPULATE_FIELDS = [
  { path: "counterpartyAccountId", select: "accountName accountCode accountNature accountCategory" },
  { path: "journalVoucherId", select: "voucherNumber voucherDate status" },
  { path: "createdBy", select: "name email" },
  { path: "postedBy", select: "name email" },
  { path: "cancelledBy", select: "name email" },
];

const findCashTransactionById = async (id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return CashTransaction.findOne({ _id: id, isDeleted: false })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const findCashTransactionByIdCompanyAndWorkspace = async (
  id,
  companyId,
  workspaceId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }
  return CashTransaction.findOne({
    _id: id,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const createCashTransaction = async (payload, options = {}) => {
  const [cashTransaction] = await CashTransaction.create([payload], {
    session: options.session || null,
  });
  return cashTransaction;
};

const getCashTransactions = async (
  workspaceId,
  companyId,
  filters = {},
  options = {},
) => {
  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.partition) query.cashPartition = filters.partition;
  if (filters.transactionType) query.transactionType = filters.transactionType;
  if (filters.direction) query.direction = filters.direction;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};
    if (filters.startDate) query.transactionDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.transactionDate.$lte = new Date(filters.endDate);
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { transactionNumber: searchRegex },
      { referenceNumber: searchRegex },
      { narration: searchRegex },
    ];
  }

  const sort = options.sort || { transactionDate: -1, createdAt: -1 };

  if (options.all === true) {
    const cashTransactions = await CashTransaction.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .session(options.session || null);
    return { cashTransactions, total: cashTransactions.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [cashTransactions, total] = await Promise.all([
    CashTransaction.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    CashTransaction.countDocuments(query).session(options.session || null),
  ]);

  return { cashTransactions, total, page, limit };
};

const getNextTransactionNumber = async (companyId, workspaceId, options = {}) => {
  const year = new Date().getFullYear();
  const prefix = `CT-${year}-`;

  const last = await CashTransaction.findOne({
    companyId,
    workspaceId,
    transactionNumber: { $regex: `^${prefix}` },
  })
    .sort({ transactionNumber: -1 })
    .select("transactionNumber")
    .session(options.session || null);

  let seq = 1;
  if (last) {
    const parts = last.transactionNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
};

export default {
  findCashTransactionById,
  findCashTransactionByIdCompanyAndWorkspace,
  createCashTransaction,
  getCashTransactions,
  getNextTransactionNumber,
};
