import ApiError from "../../../../utils/ApiError.js";
import ledgerRepository from "../repositories/ledger.repository.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";
import Ledger from "../models/ledger.model.js";

const createLedgerEntry = async (session, payload) => {
  const {
    workspaceId,
    companyId,
    accountId,
    voucherId,
    voucherNumber,
    voucherDate,
    debit,
    credit,
    narration,
  } = payload;

  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId,
    { session }
  );

  if (!account) {
    throw new ApiError(404, "Account not found for ledger entry");
  }

  // Find the last chronological ledger entry
  const lastEntry = await ledgerRepository.findLastLedgerEntry(
    workspaceId,
    companyId,
    accountId,
    { session }
  );

  let lastBalance = 0;
  const isAssetOrExpense = ["ASSET", "EXPENSE"].includes(account.accountNature);

  if (lastEntry) {
    lastBalance = lastEntry.runningBalance || 0;
  } else {
    // If no prior entry, check if this is the opening balance voucher itself.
    // If it is, the baseline starts at 0 because the OB entry itself will establish the opening balance.
    const isOB = voucherNumber && voucherNumber.startsWith("OB-");
    if (!isOB) {
      const opBal = account.openingBalance || 0;
      if (isAssetOrExpense) {
        lastBalance = account.openingBalanceType === "dr" ? opBal : -opBal;
      } else {
        lastBalance = account.openingBalanceType === "cr" ? opBal : -opBal;
      }
    }
  }

  // Calculate new running balance based on account nature
  let runningBalance = lastBalance;
  if (isAssetOrExpense) {
    runningBalance = lastBalance + debit - credit;
  } else {
    runningBalance = lastBalance + credit - debit;
  }

  const entry = await ledgerRepository.createLedgerEntry(
    {
      workspaceId,
      companyId,
      accountId,
      voucherId,
      voucherNumber,
      voucherDate: new Date(voucherDate),
      debit,
      credit,
      runningBalance,
      narration,
    },
    { session }
  );

  return entry.toSafeObject();
};

const deleteLedgerEntriesByVoucherId = async (session, voucherId) => {
  return ledgerRepository.deleteLedgerEntriesByVoucherId(voucherId, { session });
};

const recalculateLedger = async (
  accountId,
  companyId,
  workspaceId,
  options = {}
) => {
  const session = options.session;

  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId,
    { session }
  );

  if (!account) {
    throw new ApiError(404, "Account not found for ledger recalculation");
  }

  // Retrieve all ledger entries in strict ascending order
  const entriesResult = await ledgerRepository.getLedgerEntries(
    workspaceId,
    companyId,
    accountId,
    {},
    { all: true, session }
  );

  const entries = entriesResult.entries;
  const isAssetOrExpense = ["ASSET", "EXPENSE"].includes(account.accountNature);

  // Initialize balance. If the ledger has an OB entry, starting baseline is 0.
  const hasOB = entries.some((e) => e.voucherNumber && e.voucherNumber.startsWith("OB-"));
  const opBal = hasOB ? 0 : (account.openingBalance || 0);

  let currentBalance = 0;
  if (isAssetOrExpense) {
    currentBalance = account.openingBalanceType === "dr" ? opBal : -opBal;
  } else {
    currentBalance = account.openingBalanceType === "cr" ? opBal : -opBal;
  }

  // Re-sequence all subsequent running balances
  for (const entry of entries) {
    if (isAssetOrExpense) {
      currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0);
    } else {
      currentBalance = currentBalance + (entry.credit || 0) - (entry.debit || 0);
    }
    entry.runningBalance = currentBalance;
    await entry.save({ session });
  }

  return { success: true, count: entries.length };
};

const getLedger = async (workspaceId, companyId, query = {}) => {
  const { accountId, page, limit, sort, all, ...filters } = query;

  const result = await ledgerRepository.getLedgerEntries(
    workspaceId,
    companyId,
    accountId,
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    entries: result.entries.map((e) => e.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

export default {
  createLedgerEntry,
  deleteLedgerEntriesByVoucherId,
  recalculateLedger,
  getLedger,
};
