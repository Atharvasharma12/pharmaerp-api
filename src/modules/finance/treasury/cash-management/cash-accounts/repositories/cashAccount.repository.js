import mongoose from "mongoose";
import CashAccount from "../models/cashAccount.model.js";

const findCashAccountById = async (id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return CashAccount.findOne({ _id: id, isDeleted: false }).session(
    options.session || null,
  );
};

const findCashAccountByIdCompanyAndWorkspace = async (
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
  return CashAccount.findOne({
    _id: id,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate("ledgerAccountId", "accountName accountCode status")
    .session(options.session || null);
};

const createCashAccount = async (payload, options = {}) => {
  const [cashAccount] = await CashAccount.create([payload], {
    session: options.session || null,
  });
  return cashAccount;
};

const getCashAccounts = async (
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

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.isPrimary !== undefined) {
    query.isPrimary =
      filters.isPrimary === "true" || filters.isPrimary === true;
  }
  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { accountName: searchRegex },
      { description: searchRegex },
    ];
  }

  const sort = options.sort || { isPrimary: -1, createdAt: -1 };

  if (options.all === true) {
    const cashAccounts = await CashAccount.find(query)
      .populate("ledgerAccountId", "accountName accountCode status")
      .sort(sort)
      .session(options.session || null);
    return { cashAccounts, total: cashAccounts.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [cashAccounts, total] = await Promise.all([
    CashAccount.find(query)
      .populate("ledgerAccountId", "accountName accountCode status")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    CashAccount.countDocuments(query).session(options.session || null),
  ]);

  return { cashAccounts, total, page, limit };
};

const setPrimaryCashAccount = async (
  cashAccountId,
  companyId,
  workspaceId,
  options = {},
) => {
  const session = options.session;
  // Set all others to isPrimary = false
  await CashAccount.updateMany(
    { companyId, workspaceId, _id: { $ne: cashAccountId }, isDeleted: false },
    { $set: { isPrimary: false } },
    { session },
  );

  // Set this one to isPrimary = true
  const updated = await CashAccount.findOneAndUpdate(
    { _id: cashAccountId, companyId, workspaceId, isDeleted: false },
    { $set: { isPrimary: true } },
    { new: true, session },
  );

  return updated;
};

export default {
  findCashAccountById,
  findCashAccountByIdCompanyAndWorkspace,
  createCashAccount,
  getCashAccounts,
  setPrimaryCashAccount,
};
