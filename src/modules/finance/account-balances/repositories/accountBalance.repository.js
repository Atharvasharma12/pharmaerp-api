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
  }).populate(
    "accountId",
    "accountName accountCode accountNature accountCategory openingBalance openingBalanceType description isSystem isCustomer isSupplier"
  );
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

  if (filters.balanceType && filters.balanceType !== "all") {
    query.balanceType = String(filters.balanceType).toLowerCase();
  }

  const accountFilter = {
    workspaceId,
    companyId,
    isDeleted: false,
  };
  let shouldFilterAccounts = false;

  // 1. Account Scope Filter (company/general default, customer, supplier, all)
  const scope = (filters.accountScope || "company").toLowerCase();
  if (scope === "company" || scope === "general") {
    accountFilter.accountCategory = { $nin: ["CUSTOMER", "SUPPLIER"] };
    shouldFilterAccounts = true;
  } else if (scope === "customer") {
    accountFilter.accountCategory = "CUSTOMER";
    shouldFilterAccounts = true;
  } else if (scope === "supplier") {
    accountFilter.accountCategory = "SUPPLIER";
    shouldFilterAccounts = true;
  }

  // 2. Explicit Account Category override
  if (filters.accountCategory && filters.accountCategory !== "all") {
    accountFilter.accountCategory = filters.accountCategory;
    shouldFilterAccounts = true;
  }

  // 3. Search
  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    accountFilter.$or = [
      { accountName: searchRegex },
      { accountCode: searchRegex },
    ];
    shouldFilterAccounts = true;
  }

  // 4. Account Nature
  if (filters.accountNature && filters.accountNature !== "all") {
    accountFilter.accountNature = filters.accountNature;
    shouldFilterAccounts = true;
  }

  if (shouldFilterAccounts) {
    const matchingAccounts = await Account.find(accountFilter).select("_id");
    const matchingAccountIds = matchingAccounts.map((a) => a._id);
    query.accountId = { $in: matchingAccountIds };
  }

  // Branch isolation for Cash Accounts: STRICT whitelist approach
  if (filters.branchId) {
    const AccountModel = mongoose.model("Account");
    const allCashAccounts = await AccountModel.find({
      companyId,
      isDeleted: false,
      accountCategory: "CASH",
    }).select("_id");
    const allCashAccountIds = allCashAccounts.map((a) => a._id.toString());

    const BranchCash = mongoose.model("BranchCash");
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);
    const validBranchCashAccounts = await BranchCash.find({
      companyId,
      isActive: true,
      branchId: targetBranchId,
    }).select("ledgerAccountId");
    const validLedgerIds = validBranchCashAccounts
      .map((c) => c.ledgerAccountId?.toString())
      .filter(Boolean);

    const invalidLedgerIds = allCashAccountIds
      .filter((id) => !validLedgerIds.includes(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (invalidLedgerIds.length > 0) {
      if (query.accountId && Array.isArray(query.accountId.$in)) {
        query.accountId.$in = query.accountId.$in.filter(
          (id) => !invalidLedgerIds.some((inv) => inv.equals(id))
        );
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
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 10));
  const skip = (page - 1) * limit;

  // Build match query for aggregation statistics
  const aggMatch = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
  };
  if (query.balanceType) {
    aggMatch.balanceType = query.balanceType;
  }
  if (query.accountId) {
    aggMatch.accountId = query.accountId;
  }

  const [balances, total, statsAgg] = await Promise.all([
    AccountBalance.find(query)
      .populate("accountId", "accountName accountCode accountNature accountCategory")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    AccountBalance.countDocuments(query),
    AccountBalance.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: null,
          totalAccounts: { $sum: 1 },
          totalDebit: { $sum: "$debitTotal" },
          totalCredit: { $sum: "$creditTotal" },
          drCount: { $sum: { $cond: [{ $eq: ["$balanceType", "dr"] }, 1, 0] } },
          crCount: { $sum: { $cond: [{ $eq: ["$balanceType", "cr"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  // Handle post-sorting by account name if requested
  if (options.sort && (options.sort.name || options.sort.accountName)) {
    const order = (options.sort.name || options.sort.accountName) === 1 ? 1 : -1;
    balances.sort((a, b) => {
      const nameA = a.accountId?.accountName || "";
      const nameB = b.accountId?.accountName || "";
      return order * nameA.localeCompare(nameB);
    });
  }

  const summary = statsAgg[0] || {
    totalAccounts: total,
    totalDebit: 0,
    totalCredit: 0,
    drCount: 0,
    crCount: 0,
  };

  return { balances, total, page, limit, summary };
};

export default {
  findBalanceByAccountId,
  upsertBalance,
  accumulateBalance,
  getBalances,
};
