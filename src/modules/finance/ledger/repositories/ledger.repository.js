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
    workspaceId,
    companyId,
  };

  if (accountId) {
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      query.accountId = accountId;
    } else {
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
    return { entries, total: entries.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    Ledger.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .populate("voucherId", "voucherType referenceNumber narration status")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    Ledger.countDocuments(query).session(options.session || null),
  ]);

  return { entries, total, page, limit };
};

export default {
  createLedgerEntry,
  findLastLedgerEntry,
  deleteLedgerEntriesByVoucherId,
  getLedgerEntries,
};
