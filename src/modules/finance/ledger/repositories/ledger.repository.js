import mongoose from "mongoose";
import Ledger from "../models/ledger.model.js";

const createLedgerEntry = async (payload, options = {}) => {
  const t = Date.now();
  const [entry] = await Ledger.create([payload], {
    session: options.session || null,
  });
  import('fs').then(fs => fs.appendFileSync('c:\\Users\\Intel\\Desktop\\erp\\erp-backend\\scratch-timing.txt', `Ledger.create took: ${Date.now() - t}ms\\n`));
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

  const t = Date.now();
  const res = await Ledger.findOne({
    workspaceId,
    companyId,
    accountId,
  })
    .sort({ voucherDate: -1, createdAt: -1 })
    .session(options.session || null);
  
  import('fs').then(fs => fs.appendFileSync('c:\\Users\\Intel\\Desktop\\erp\\erp-backend\\scratch-timing.txt', `findLastLedgerEntry took: ${Date.now() - t}ms\\n`));
  return res;
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

  if (accountId) {
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      query.accountId = new mongoose.Types.ObjectId(accountId);
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

  // Branch isolation for Cash Accounts: STRICT whitelist approach
  if (filters.branchId) {
    const Account = mongoose.model("Account");
    const allCashAccounts = await Account.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
      accountCategory: "CASH"
    }).select("_id");
    const allCashAccountIds = allCashAccounts.map(a => a._id.toString());

    const BranchCash = mongoose.model("BranchCash");
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);
    const validBranchCashAccounts = await BranchCash.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      isActive: true,
      branchId: targetBranchId
    }).select("ledgerAccountId");
    const validLedgerIds = validBranchCashAccounts
      .map(c => c.ledgerAccountId?.toString())
      .filter(Boolean);

    const invalidLedgerIds = allCashAccountIds
      .filter(id => !validLedgerIds.includes(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (invalidLedgerIds.length > 0) {
      if (query.accountId) {
        // If accountId is already requested, but it belongs to another branch, return empty!
        const requestedId = query.accountId.toString();
        if (invalidLedgerIds.some(id => id.toString() === requestedId)) {
          return { entries: [], total: 0, page: 1, limit: 20, totalDebit: 0, totalCredit: 0 };
        }
      } else {
        query.accountId = { $nin: invalidLedgerIds };
      }
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
