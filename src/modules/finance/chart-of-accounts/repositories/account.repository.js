import mongoose from "mongoose";
import Account from "../models/account.model.js";
import { ACCOUNT_STATUS } from "../constants/account.constant.js";

const findAccountById = async (accountId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    return null;
  }
  return Account.findOne({
    _id: accountId,
    isDeleted: { $ne: true },
  }).select(options.select || "");
};

const findAccountByIdCompanyAndWorkspace = async (
  accountId,
  companyId,
  workspaceId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Account.findOne({
    _id: accountId,
    companyId,
    workspaceId,
    isDeleted: { $ne: true },
  })
    .session(options.session || null)
    .populate("accountGroupId", "groupName groupCode nature")
    .select(options.select || "");
};

const findAccountByCode = async (companyId, accountCode, options = {}) => {
  if (!accountCode || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }
  return Account.findOne({
    companyId,
    accountCode: String(accountCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .select(options.select || "")
    .session(options.session || null);
};

const findAccountByName = async (companyId, accountName, options = {}) => {
  if (!accountName || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }
  return Account.findOne({
    companyId,
    accountName: String(accountName).trim(),
    isDeleted: false,
  }).select(options.select || "");
};

const createAccount = async (payload, options = {}) => {
  const [account] = await Account.create([payload], {
    session: options.session || null,
  });
  return account;
};

const saveAccount = async (account) => {
  return account.save();
};

const getAccountsByIds = async (accountIds, companyId, workspaceId, options = {}) => {
  return Account.find({
    _id: { $in: accountIds },
    companyId,
    workspaceId,
    isDeleted: false,
  }).session(options.session || null);
};

const getAccounts = async (
  workspaceId,
  companyId,
  filters = {},
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { accounts: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.accountGroupId) {
    query.accountGroupId = filters.accountGroupId;
  }

  if (filters.accountNature) {
    query.accountNature = filters.accountNature;
  }

  if (filters.accountCategory) {
    query.accountCategory = filters.accountCategory;
  }

  if (filters.excludeCategories) {
    const excludeArr = filters.excludeCategories.split(",").map(c => c.trim());
    query.accountCategory = { $nin: excludeArr };
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ accountName: searchRegex }, { accountCode: searchRegex }];
  }

  // Branch isolation for Cash Accounts: STRICT whitelist approach
  if (filters.branchId) {
    const Account = mongoose.model("Account");
    const allCashAccounts = await Account.find({
      companyId,
      isDeleted: false,
      accountCategory: "CASH"
    }).select("_id");
    const allCashAccountIds = allCashAccounts.map(a => a._id.toString());

    const CashAccount = mongoose.model("CashAccount");
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);
    const validBranchCashAccounts = await CashAccount.find({
      companyId,
      isDeleted: false,
      branchId: targetBranchId
    }).select("ledgerAccountId");
    const validLedgerIds = validBranchCashAccounts
      .map(c => c.ledgerAccountId?.toString())
      .filter(Boolean);

    const invalidLedgerIds = allCashAccountIds
      .filter(id => !validLedgerIds.includes(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (invalidLedgerIds.length > 0) {
      if (query._id) {
        // If there's already an _id query (e.g. from search), merge it
        query._id = { ...query._id, $nin: invalidLedgerIds };
      } else {
        query._id = { $nin: invalidLedgerIds };
      }
    }
  }

  const sort = options.sort || { accountName: 1 };

  if (options.all === true) {
    const accounts = await Account.find(query)
      .populate("accountGroupId", "groupName groupCode nature")
      .sort(sort)
      .select(options.select || "");
    return { accounts, total: accounts.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    Account.find(query)
      .populate("accountGroupId", "groupName groupCode nature")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    Account.countDocuments(query),
  ]);

  return { accounts, total, page, limit };
};

const deleteAccountById = async (
  accountId,
  companyId,
  workspaceId,
  deletedBy,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Account.findOneAndUpdate(
    {
      _id: accountId,
      companyId,
      workspaceId,
      isDeleted: false,
      isSystemAccount: false,
    },
    {
      isDeleted: true,
      status: ACCOUNT_STATUS.INACTIVE,
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  findAccountById,
  findAccountByIdCompanyAndWorkspace,
  findAccountByCode,
  findAccountByName,
  createAccount,
  saveAccount,
  getAccountsByIds,
  getAccounts,
  deleteAccountById,
};
