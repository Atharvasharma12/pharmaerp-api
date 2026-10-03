import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import accountBalanceRepository from "../../account-balances/repositories/accountBalance.repository.js";
import AccountBalance from "../../account-balances/models/accountBalance.model.js";
import ledgerService from "../../ledger/services/ledger.service.js";
import Ledger from "../../ledger/models/ledger.model.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";
import gstLedgerRepository from "../../gst-ledger/repositories/gstLedger.repository.js";
import { VOUCHER_STATUS } from "../constants/voucherStatus.constant.js";
import { VOUCHER_TYPE } from "../constants/voucherType.constant.js";

const postJournalVoucher = async (voucherId, companyId, workspaceId, userId, options = {}) => {
  const session = options.session || (await mongoose.startSession());
  const runInOuterSession = !!options.session;

  if (!runInOuterSession) {
    session.startTransaction();
  }

  try {
    const voucher = options.preLoadedVoucher || await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
      voucherId,
      companyId,
      workspaceId,
      { session }
    );

    if (!voucher) {
      throw new ApiError(404, "Journal Voucher not found");
    }

    if (voucher.status === VOUCHER_STATUS.POSTED) {
      throw new ApiError(400, "Journal Voucher is already posted");
    }

    if (voucher.status === VOUCHER_STATUS.CANCELLED) {
      throw new ApiError(400, "Cancelled Journal Vouchers cannot be posted");
    }

    const lines = options.preLoadedLines || await journalLineRepository.findLinesByVoucherId(voucherId, { session });
    if (!lines || lines.length < 2) {
      throw new ApiError(400, "Voucher has insufficient lines to post");
    }

    const postingDate = voucher.voucherDate || new Date();

    const accountIds = lines.map((l) => l.accountId?._id || l.accountId);

    // 1-3. Fetch account balances, last ledger entries, and account details CONCURRENTLY
    const [balances, lastEntries, accounts] = await Promise.all([
      AccountBalance.find({
        accountId: { $in: accountIds },
        companyId,
        workspaceId,
      }).session(session),
      
      Ledger.aggregate([
        { $match: { accountId: { $in: accountIds }, companyId, workspaceId } },
        { $sort: { voucherDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: "$accountId",
            lastEntry: { $first: "$$ROOT" },
          },
        },
      ]).session(session),
      
      accountRepository.getAccountsByIds(accountIds, companyId, workspaceId, { session })
    ]);

    const balanceMap = {};
    balances.forEach((b) => {
      balanceMap[b.accountId.toString()] = b;
    });

    const lastLedgerMap = {};
    lastEntries.forEach((g) => {
      lastLedgerMap[g._id.toString()] = g.lastEntry;
    });

    const accountMap = {};
    if (accounts) {
      accounts.forEach((a) => {
        accountMap[a._id.toString()] = a;
      });
    }

    const balanceUpserts = [];
    const ledgerInserts = [];

    // Process and accumulate account balances & write ledger entries in memory
    for (const line of lines) {
      const debitChange = line.debit || 0;
      const creditChange = line.credit || 0;
      const accountIdValue = line.accountId?._id || line.accountId;
      const accIdStr = accountIdValue.toString();

      // --- 1. Account Balance Calculation ---
      let balanceObj = balanceMap[accIdStr];
      if (!balanceObj) {
        balanceObj = {
          accountId: accountIdValue,
          companyId,
          workspaceId,
          debitTotal: 0,
          creditTotal: 0,
        };
        balanceMap[accIdStr] = balanceObj;
      }

      balanceObj.debitTotal += debitChange;
      balanceObj.creditTotal += creditChange;

      let newBalance = 0;
      let newBalanceType = "dr";
      if (balanceObj.debitTotal >= balanceObj.creditTotal) {
        newBalance = balanceObj.debitTotal - balanceObj.creditTotal;
        newBalanceType = "dr";
      } else {
        newBalance = balanceObj.creditTotal - balanceObj.debitTotal;
        newBalanceType = "cr";
      }

      balanceUpserts.push({
        updateOne: {
          filter: { accountId: accountIdValue, companyId, workspaceId },
          update: {
            $set: {
              debitTotal: balanceObj.debitTotal,
              creditTotal: balanceObj.creditTotal,
              balance: newBalance,
              balanceType: newBalanceType,
              lastTransactionAt: postingDate,
            },
          },
          upsert: true,
        },
      });

      // --- 2. Ledger Running Balance Calculation ---
      const account = accountMap[accIdStr];
      const isAssetOrExpense = account ? ["ASSET", "EXPENSE"].includes(account.accountNature) : false;

      let lastBalance = 0;
      const lastEntry = lastLedgerMap[accIdStr];
      if (lastEntry) {
        lastBalance = lastEntry.runningBalance || 0;
      } else {
        const isOB = voucher.voucherNumber && voucher.voucherNumber.startsWith("OB-");
        if (!isOB && account) {
          const opBal = account.openingBalance || 0;
          if (isAssetOrExpense) {
            lastBalance = account.openingBalanceType === "dr" ? opBal : -opBal;
          } else {
            lastBalance = account.openingBalanceType === "cr" ? opBal : -opBal;
          }
        }
      }

      let runningBalance = lastBalance;
      if (isAssetOrExpense) {
        runningBalance = lastBalance + debitChange - creditChange;
      } else {
        runningBalance = lastBalance + creditChange - debitChange;
      }

      ledgerInserts.push({
        workspaceId,
        companyId,
        accountId: accountIdValue,
        voucherId: voucher._id,
        voucherNumber: voucher.voucherNumber,
        voucherDate: postingDate,
        debit: debitChange,
        credit: creditChange,
        runningBalance,
        narration: line.narration || voucher.narration || "Journal entry posting",
      });

      // Update lastLedgerMap so subsequent lines on the same account in this voucher use the correct running balance
      lastLedgerMap[accIdStr] = { runningBalance };
    }

    // 4. Bulk execute updates
    if (balanceUpserts.length > 0) {
      await AccountBalance.bulkWrite(balanceUpserts, { session });
    }
    if (ledgerInserts.length > 0) {
      await Ledger.insertMany(ledgerInserts, { session });
    }
    voucher.status = VOUCHER_STATUS.POSTED;
    voucher.postedAt = new Date();
    voucher.postedBy = userId;
    await voucher.save({ session });

    if (!runInOuterSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return voucher.toSafeObject();
  } catch (error) {
    if (!runInOuterSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

const reverseJournalVoucherBalances = async (voucher, lines, companyId, workspaceId, options = {}) => {
  const session = options.session;
  const postingDate = voucher.voucherDate || new Date();

  // 1. Delete associated ledger entries
  await ledgerService.deleteLedgerEntriesByVoucherId(session, voucher._id);

  // 2. Reverse balance changes and recalculate ledger for each account
  for (const line of lines) {
    const debitChange = -(line.debit || 0);
    const creditChange = -(line.credit || 0);

    const accountIdValue = line.accountId?._id || line.accountId;

    await accountBalanceRepository.accumulateBalance(
      accountIdValue,
      companyId,
      workspaceId,
      debitChange,
      creditChange,
      postingDate
    );

    // Re-calculate running balances now that the entries are removed
    await ledgerService.recalculateLedger(accountIdValue, companyId, workspaceId, {
      session,
    });
  }
};

export default {
  postJournalVoucher,
  reverseJournalVoucherBalances,
};

