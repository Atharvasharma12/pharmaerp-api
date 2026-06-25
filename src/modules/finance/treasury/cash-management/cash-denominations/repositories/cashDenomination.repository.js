import mongoose from "mongoose";
import CashDenomination from "../models/cashDenomination.model.js";

const POPULATE_FIELDS = [
  { path: "cashAccountId", select: "accountName ledgerAccountId" },
  { path: "createdBy", select: "name email" },
  { path: "confirmedBy", select: "name email" },
  { path: "cancelledBy", select: "name email" },
  { path: "adjustmentJournalVoucherId", select: "voucherNumber voucherDate status" },
];

const findCashDenominationById = async (id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return CashDenomination.findOne({ _id: id, isDeleted: false })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const findCashDenominationByIdCompanyAndWorkspace = async (
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
  return CashDenomination.findOne({
    _id: id,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const createCashDenomination = async (payload, options = {}) => {
  const [cashDenomination] = await CashDenomination.create([payload], {
    session: options.session || null,
  });
  return cashDenomination;
};

const getCashDenominations = async (
  workspaceId,
  companyId,
  filters = {},
  options = {},
) => {
  const query = { workspaceId, companyId, isDeleted: false };

  if (filters.cashAccountId) query.cashAccountId = filters.cashAccountId;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.countDate = {};
    if (filters.startDate) query.countDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.countDate.$lte = new Date(filters.endDate);
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { countNumber: regex },
      { narration: regex },
    ];
  }

  const sort = options.sort || { countDate: -1, createdAt: -1 };

  if (options.all === true) {
    const cashDenominations = await CashDenomination.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .session(options.session || null);
    return { cashDenominations, total: cashDenominations.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [cashDenominations, total] = await Promise.all([
    CashDenomination.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    CashDenomination.countDocuments(query).session(options.session || null),
  ]);

  return { cashDenominations, total, page, limit };
};

const getNextCountNumber = async (companyId, workspaceId, options = {}) => {
  const year = new Date().getFullYear();
  const prefix = `CD-${year}-`;

  const last = await CashDenomination.findOne({
    companyId,
    workspaceId,
    countNumber: { $regex: `^${prefix}` },
  })
    .sort({ countNumber: -1 })
    .select("countNumber")
    .session(options.session || null);

  let seq = 1;
  if (last) {
    const parts = last.countNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
};

export default {
  findCashDenominationById,
  findCashDenominationByIdCompanyAndWorkspace,
  createCashDenomination,
  getCashDenominations,
  getNextCountNumber,
};
