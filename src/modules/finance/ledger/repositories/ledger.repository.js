import mongoose from "mongoose";
import Ledger from "../models/ledger.model.js";

const createLedgerEntry = async (payload, options = {}) => {
  const [entry] = await Ledger.create([payload], {
    session: options.session || null,
  });
  return entry;
};

const findLastLedgerEntry = async (
  workspaceId,
  companyId,
  accountId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(accountId)
  ) {
    return null;
  }

  return Ledger.findOne({
    workspaceId,
    companyId,
    accountId,
  })
    .sort({ voucherDate: -1, createdAt: -1 })
    .session(options.session || null);
};

const deleteLedgerEntriesByVoucherId = async (voucherId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(voucherId)) {
    return null;
  }

  return Ledger.deleteMany(
    { voucherId },
    {
      session: options.session || null,
    }
  );
};

const getLedgerEntries = async (
  workspaceId,
  companyId,
  accountId,
  filters = {},
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { entries: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
  };
  
  console.log("getLedgerEntries query:", query);

  if (accountId) {
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      query.accountId = new mongoose.Types.ObjectId(accountId);
      console.log("getLedgerEntries adding accountId:", query.accountId);
    } else {
      console.log("getLedgerEntries invalid accountId:", accountId);
      return { entries: [], total: 0, page: 1, limit: 20 };
    }
  }

  if (filters.startDate || filters.endDate) {
    query.voucherDate = {};
    if (filters.startDate) {
      query.voucherDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.voucherDate.$lte = new Date(filters.endDate);
    }
  }

  // Chronological sorting is default for ledgers
  const sort = options.sort || { voucherDate: 1, createdAt: 1 };

  if (options.all === true) {
    const entries = await Ledger.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .populate("voucherId", "voucherType referenceNumber narration status")
      .sort(sort)
      .session(options.session || null);
    const aggregate = await Ledger.aggregate([
      { $match: query },
      { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } }
    ]);
    const totalDebit = aggregate[0]?.totalDebit || 0;
    const totalCredit = aggregate[0]?.totalCredit || 0;
    
    return { entries, total: entries.length, totalDebit, totalCredit };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [entries, total, aggregate] = await Promise.all([
    Ledger.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .populate("voucherId", "voucherType referenceNumber narration status")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    Ledger.countDocuments(query).session(options.session || null),
    Ledger.aggregate([
      { $match: query },
      { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } }
    ])
  ]);

  const totalDebit = aggregate[0]?.totalDebit || 0;
  const totalCredit = aggregate[0]?.totalCredit || 0;

  return { entries, total, page, limit, totalDebit, totalCredit };
};

export default {
  createLedgerEntry,
  findLastLedgerEntry,
  deleteLedgerEntriesByVoucherId,
  getLedgerEntries,
};
