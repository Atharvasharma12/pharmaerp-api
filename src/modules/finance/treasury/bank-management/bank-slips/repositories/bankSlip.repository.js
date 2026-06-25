import mongoose from "mongoose";
import BankSlip from "../models/bankSlip.model.js";

const POPULATE_FIELDS = [
  {
    path: "bankAccountId",
    select: "accountName accountNumber bankMasterId",
    populate: { path: "bankMasterId", select: "name shortName" },
  },
  { path: "bankTransactionId", select: "transactionNumber transactionDate status" },
  { path: "journalVoucherId", select: "voucherNumber voucherDate status" },
  { path: "createdBy", select: "name email" },
  { path: "submittedBy", select: "name email" },
  { path: "confirmedBy", select: "name email" },
  { path: "rejectedBy", select: "name email" },
  { path: "cancelledBy", select: "name email" },
];

const findBankSlipById = async (id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return BankSlip.findOne({ _id: id, isDeleted: false })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const findBankSlipByIdCompanyAndWorkspace = async (
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
  return BankSlip.findOne({ _id: id, companyId, workspaceId, isDeleted: false })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const createBankSlip = async (payload, options = {}) => {
  const [bankSlip] = await BankSlip.create([payload], {
    session: options.session || null,
  });
  return bankSlip;
};

const getBankSlips = async (workspaceId, companyId, filters = {}, options = {}) => {
  const query = { workspaceId, companyId, isDeleted: false };

  if (filters.bankAccountId) query.bankAccountId = filters.bankAccountId;
  if (filters.slipType) query.slipType = filters.slipType;
  if (filters.status) query.status = filters.status;

  if (filters.startDate || filters.endDate) {
    query.slipDate = {};
    if (filters.startDate) query.slipDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.slipDate.$lte = new Date(filters.endDate);
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { slipNumber: regex },
      { bankSlipReference: regex },
      { narration: regex },
    ];
  }

  const sort = options.sort || { slipDate: -1, createdAt: -1 };

  if (options.all === true) {
    const bankSlips = await BankSlip.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .session(options.session || null);
    return { bankSlips, total: bankSlips.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [bankSlips, total] = await Promise.all([
    BankSlip.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    BankSlip.countDocuments(query).session(options.session || null),
  ]);

  return { bankSlips, total, page, limit };
};

const getNextSlipNumber = async (companyId, workspaceId, options = {}) => {
  const year = new Date().getFullYear();
  const prefix = `BS-${year}-`;

  const last = await BankSlip.findOne({
    companyId,
    workspaceId,
    slipNumber: { $regex: `^${prefix}` },
  })
    .sort({ slipNumber: -1 })
    .select("slipNumber")
    .session(options.session || null);

  let seq = 1;
  if (last) {
    const parts = last.slipNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
};

export default {
  findBankSlipById,
  findBankSlipByIdCompanyAndWorkspace,
  createBankSlip,
  getBankSlips,
  getNextSlipNumber,
};
