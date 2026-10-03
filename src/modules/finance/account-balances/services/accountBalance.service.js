import ApiError from "../../../../utils/ApiError.js";
import accountBalanceRepository from "../repositories/accountBalance.repository.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";

const getBalances = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await accountBalanceRepository.getBalances(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    balances: result.balances.map((b) => b.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getBalanceByAccountId = async (accountId, companyId, workspaceId) => {
  const balance = await accountBalanceRepository.findBalanceByAccountId(
    accountId,
    companyId,
    workspaceId
  );

  if (balance) {
    return balance.toSafeObject();
  }

  // Verify that the account actually exists
  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId
  );
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  // Return a default virtual balance object if no transactions/balance record exists yet
  return {
    workspaceId,
    companyId,
    accountId: account.toSafeObject(),
    debitTotal: 0,
    creditTotal: 0,
    balance: 0,
    balanceType: "dr",
    lastTransactionAt: null,
  };
};

const recalculateBalance = async (accountId, companyId, workspaceId) => {
  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId
  );
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  let debitTotal = 0;
  let creditTotal = 0;

  // Retrieve all ledger entries to recalculate absolute totals
  const ledgerRepository = (await import("../../ledger/repositories/ledger.repository.js")).default;
  const entriesResult = await ledgerRepository.getLedgerEntries(
    workspaceId,
    companyId,
    accountId,
    {},
    { all: true }
  );

  if (entriesResult && entriesResult.entries && entriesResult.entries.length > 0) {
    for (const entry of entriesResult.entries) {
      debitTotal += entry.debit || 0;
      creditTotal += entry.credit || 0;
    }
  } else {
    // Fallback if no ledger exists yet but there is an opening balance
    if (account.openingBalance && account.openingBalance > 0) {
      const type = account.openingBalanceType || "dr";
      if (type.toLowerCase() === "dr") {
        debitTotal = account.openingBalance;
      } else {
        creditTotal = account.openingBalance;
      }
    }
  }

  // We should also recalculate the ledger running balances for consistency
  const ledgerService = (await import("../../ledger/services/ledger.service.js")).default;
  await ledgerService.recalculateLedger(accountId, companyId, workspaceId, {});

  const updatedBalance = await accountBalanceRepository.upsertBalance(
    accountId,
    companyId,
    workspaceId,
    debitTotal,
    creditTotal,
    null
  );

  return updatedBalance.toSafeObject();
};

export default {
  getBalances,
  getBalanceByAccountId,
  recalculateBalance,
};
