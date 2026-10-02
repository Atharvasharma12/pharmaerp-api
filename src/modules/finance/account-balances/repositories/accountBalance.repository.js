import mongoose from "mongoose";
import AccountBalance from "../models/accountBalance.model.js";
import Account from "../../chart-of-accounts/models/account.model.js";

const findBalanceByAccountId = async (accountId, companyId, workspaceId) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return AccountBalance.findOne({
    accountId,
    companyId,
    workspaceId,
  }).populate("accountId", "accountName accountCode accountNature accountCategory");
};

const upsertBalance = async (
  accountId,
  companyId,
  workspaceId,
  debitTotal,
  creditTotal,
  lastTransactionAt = null
) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  let balanceObj = await AccountBalance.findOne({
    accountId,
    companyId,
    workspaceId,
  });

  if (!balanceObj) {
    balanceObj = new AccountBalance({
      workspaceId,
      companyId,
      accountId,
    });
  }

  if (debitTotal !== undefined) balanceObj.debitTotal = debitTotal;
  if (creditTotal !== undefined) balanceObj.creditTotal = creditTotal;
  if (lastTransactionAt !== undefined) balanceObj.lastTransactionAt = lastTransactionAt;

  return balanceObj.save();
};

const accumulateBalance = async (
  accountId,
  companyId,
  workspaceId,
  debitChange = 0,
  creditChange = 0,
  lastTransactionAt = new Date(),
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(accountId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  const session = options.session || null;

  let balanceObj = await AccountBalance.findOne({
    accountId,
    companyId,
    workspaceId,
  }).session(session);

  if (!balanceObj) {
    balanceObj = new AccountBalance({
      workspaceId,
      companyId,
      accountId,
      debitTotal: 0,
      creditTotal: 0,
    });
  }

  balanceObj.debitTotal += debitChange;
  balanceObj.creditTotal += creditChange;
  balanceObj.lastTransactionAt = lastTransactionAt;

  return balanceObj.save({ session });
};

const getBalances = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { balances: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
  };

  if (filters.balanceType) {
    query.balanceType = filters.balanceType;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    const matchingAccounts = await Account.find({
      workspaceId,
      companyId,
      isDeleted: false,
      $or: [
        { accountName: searchRegex },
        { accountCode: searchRegex },
      ],
    }).select("_id");

    const matchingAccountIds = matchingAccounts.map((a) => a._id);
    query.accountId = { $in: matchingAccountIds };
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
      if (query.accountId) {
        // if accountId is already constrained by $in from search
        query.accountId = { ...query.accountId, $nin: invalidLedgerIds };
      } else {
        query.accountId = { $nin: invalidLedgerIds };
      }
    }
  }

  const sort = options.sort || { lastTransactionAt: -1, createdAt: -1 };

  if (options.all === true) {
    const balances = await AccountBalance.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .sort(sort);
    return { balances, total: balances.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [balances, total] = await Promise.all([
    AccountBalance.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    AccountBalance.countDocuments(query),
  ]);

  return { balances, total, page, limit };
};

export default {
  findBalanceByAccountId,
  upsertBalance,
  accumulateBalance,
  getBalances,
};
