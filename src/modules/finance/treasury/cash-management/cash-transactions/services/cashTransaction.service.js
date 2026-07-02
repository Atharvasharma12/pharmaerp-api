import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashTransactionRepository from "../repositories/cashTransaction.repository.js";
import {
  CASH_TRANSACTION_DIRECTION,
  CASH_TRANSACTION_STATUS,
} from "../constants/cashTransaction.constant.js";

import CashAccount from "../../cash-accounts/models/cashAccount.model.js";
import cashAccountRepository from "../../cash-accounts/repositories/cashAccount.repository.js";
import cashDenominationBalanceRepository from "../../cash-denomination-balances/repositories/cashDenominationBalance.repository.js";
import Account from "../../../../chart-of-accounts/models/account.model.js";
import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import journalVoucherRepository from "../../../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../../journal-vouchers/services/journalPosting.service.js";
import journalCancellationService from "../../../../journal-vouchers/services/journalCancellation.service.js";
import { VOUCHER_TYPE } from "../../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../../journal-vouchers/services/voucherNumber.service.js";
import cashDenominationRepository from "../../cash-denominations/repositories/cashDenomination.repository.js";
import { CASH_DENOMINATION_STATUS } from "../../cash-denominations/constants/cashDenomination.constant.js";

// ---------------------------------------------------------------------------
// AUTO-CREATE SYSTEM ACCOUNT (for EXPENSE / PETTY_CASH auto-offset)
// ---------------------------------------------------------------------------
const findOrCreateSystemAccount = async (
  workspaceId,
  companyId,
  userId,
  accountCode,
  accountName,
  accountNature,
  accountCategory,
  groupCode,
  groupName,
  session,
) => {
  let account = await accountRepository.findAccountByCode(companyId, accountCode, { session });
  if (account) return account;

  let group = await accountGroupRepository.findGroupByCode(companyId, groupCode, { session });
  if (!group) {
    group = await accountGroupRepository.createGroup(
      {
        workspaceId,
        companyId,
        groupCode,
        groupName,
        parentGroupId: null,
        nature: accountNature,
        isSystemGroup: true,
        createdBy: userId,
      },
      { session },
    );
  }

  account = await accountRepository.createAccount(
    {
      workspaceId,
      companyId,
      accountCode,
      accountName,
      accountGroupId: group._id,
      accountNature,
      accountCategory,
      openingBalance: 0,
      openingBalanceType: "dr",
      status: "active",
      isSystemAccount: true,
      createdBy: userId,
    },
    { session },
  );
  return account;
};

// ---------------------------------------------------------------------------
// CREATE CASH TRANSACTION
// ---------------------------------------------------------------------------
const createCashTransaction = async (workspaceId, companyId, userId, payload) => {
  const {
    transactionDate,
    cashAccountId,
    transactionType,
    direction,
    amount,
    referenceNumber,
    narration,
    counterpartyAccountId,
    denominations,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify CashAccount exists and is active
    const cashAccount = await CashAccount.findOne({
      _id: cashAccountId,
      companyId,
      workspaceId,
      isDeleted: false,
      status: "active",
    }).session(session);

    if (!cashAccount) {
      throw new ApiError(400, "Cash Account not found or inactive");
    }

    const cashLedgerAccountId = cashAccount.ledgerAccountId;

    // 2a. PRE-FLIGHT: For DEBIT (cash going OUT), validate denomination sufficiency
    //     This check runs BEFORE any journal posting to prevent partial writes.
    const processedDenominations = (denominations || []).map((d) => ({
      denomination: d.denomination,
      quantity: d.quantity || 0,
      subtotal: d.denomination * (d.quantity || 0),
    }));

    if (direction === CASH_TRANSACTION_DIRECTION.DEBIT) {
      await cashDenominationBalanceRepository.validateSufficientDenominations(
        cashAccountId,
        processedDenominations,
        { session },
      );
    }

    // 2. Resolve the counterparty (offset) ledger account
    let offsetLedgerAccountId = null;

    if (counterpartyAccountId) {
      // User explicitly provided a counterparty account
      const acct = await Account.findOne({
        _id: counterpartyAccountId,
        companyId,
        isDeleted: false,
      }).session(session);
      if (!acct) throw new ApiError(400, "Counterparty account not found");
      offsetLedgerAccountId = acct._id;
    } else {
      // Auto-resolve based on transaction type
      if (transactionType === "EXPENSE") {
        const expenseAccount = await findOrCreateSystemAccount(
          workspaceId, companyId, userId,
          "CASH_EXPENSE", "Cash Expenses",
          "EXPENSE", "EXPENSE",
          "CASH_EXPENSE_GRP", "Cash Expenses",
          session,
        );
        offsetLedgerAccountId = expenseAccount._id;
      } else if (transactionType === "PETTY_CASH") {
        const pettyAccount = await findOrCreateSystemAccount(
          workspaceId, companyId, userId,
          "PETTY_CASH_EXP", "Petty Cash Expenses",
          "EXPENSE", "EXPENSE",
          "PETTY_CASH_GRP", "Petty Cash",
          session,
        );
        offsetLedgerAccountId = pettyAccount._id;
      } else {
        // CASH_IN, CASH_OUT, OTHER require counterpartyAccountId
        throw new ApiError(
          400,
          `counterpartyAccountId is required for transaction type: ${transactionType}`,
        );
      }
    }

    // 3. Generate unique transaction number
    const transactionNumber = await cashTransactionRepository.getNextTransactionNumber(
      companyId,
      workspaceId,
      { session },
    );

    // 4. Generate journal voucher number
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      workspaceId,
      VOUCHER_TYPE.JOURNAL,
      { session },
    );

    const txNarration = narration || `${transactionType} - ${transactionNumber}`;

    // 5. Build journal lines
    // CREDIT direction: Cash A/c Dr, Offset A/c Cr (money comes into cash)
    // DEBIT  direction: Offset A/c Dr, Cash A/c Cr (money goes out of cash)
    let lines;
    if (direction === CASH_TRANSACTION_DIRECTION.CREDIT) {
      lines = [
        {
          workspaceId,
          companyId,
          accountId: cashLedgerAccountId,
          debit: amount,
          credit: 0,
          narration: txNarration,
        },
        {
          workspaceId,
          companyId,
          accountId: offsetLedgerAccountId,
          debit: 0,
          credit: amount,
          narration: txNarration,
        },
      ];
    } else {
      lines = [
        {
          workspaceId,
          companyId,
          accountId: offsetLedgerAccountId,
          debit: amount,
          credit: 0,
          narration: txNarration,
        },
        {
          workspaceId,
          companyId,
          accountId: cashLedgerAccountId,
          debit: 0,
          credit: amount,
          narration: txNarration,
        },
      ];
    }

    // 6. Create journal voucher
    const journalVoucher = await journalVoucherRepository.createVoucher(
      {
        workspaceId,
        companyId,
        voucherNumber,
        voucherDate: new Date(transactionDate),
        voucherType: VOUCHER_TYPE.JOURNAL,
        referenceNumber: referenceNumber || null,
        narration: txNarration,
        totalDebit: amount,
        totalCredit: amount,
        createdBy: userId,
      },
      { session },
    );

    // 7. Add voucherId to lines and save
    const linesWithVoucher = lines.map((l) => ({ ...l, voucherId: journalVoucher._id }));
    await journalLineRepository.createLines(linesWithVoucher, { session });

    // 8. Post the voucher immediately
    await journalPostingService.postJournalVoucher(
      journalVoucher._id,
      companyId,
      workspaceId,
      userId,
      { session },
    );

    // 9. Save the Cash Transaction record
    const txPayload = {
      workspaceId,
      companyId,
      transactionNumber,
      transactionDate: new Date(transactionDate),
      cashAccountId,
      transactionType,
      direction,
      amount,
      referenceNumber: referenceNumber || null,
      narration: narration || null,
      counterpartyAccountId: offsetLedgerAccountId,
      journalVoucherId: journalVoucher._id,
      status: CASH_TRANSACTION_STATUS.POSTED,
      postedAt: new Date(),
      postedBy: userId,
      createdBy: userId,
    };

    // 10. Create a CONFIRMED denomination count record and update the running balance
    let cashDenominationId = null;
    if (denominations && denominations.length > 0) {
      const physicalTotal = processedDenominations.reduce(
        (sum, d) => sum + d.subtotal,
        0,
      );

      const countNumber = await cashDenominationRepository.getNextCountNumber(
        companyId,
        workspaceId,
        { session },
      );

      // Look up the cash account's branch for denormalization
      const cashAccountDoc = await mongoose
        .model("CashAccount")
        .findOne({ _id: cashAccountId })
        .select("branchId")
        .session(session);

      const denomRecord = await cashDenominationRepository.createCashDenomination(
        {
          workspaceId,
          companyId,
          cashAccountId,
          branchId: cashAccountDoc?.branchId || null,
          countNumber,
          countDate: new Date(transactionDate),
          denominations: processedDenominations,
          physicalTotal,
          expectedBalance: amount,
          variance: 0,
          narration: narration || `Cash denomination count for ${transactionNumber}`,
          status: CASH_DENOMINATION_STATUS.CONFIRMED,
          confirmedAt: new Date(),
          confirmedBy: userId,
          createdBy: userId,
        },
        { session },
      );
      cashDenominationId = denomRecord._id;

      // Update CashDenominationBalance running totals
      // CREDIT = cash IN → add denominations
      // DEBIT  = cash OUT → subtract denominations (already validated above)
      if (direction === CASH_TRANSACTION_DIRECTION.CREDIT) {
        await cashDenominationBalanceRepository.addDenominations(
          cashAccountId,
          processedDenominations,
          userId,
          { session },
        );
      } else {
        await cashDenominationBalanceRepository.subtractDenominations(
          cashAccountId,
          processedDenominations,
          userId,
          { session },
        );
      }
    }

    if (cashDenominationId) {
      txPayload.cashDenominationId = cashDenominationId;
    }

    const cashTransaction = await cashTransactionRepository.createCashTransaction(
      txPayload,
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getCashTransactionById(cashTransaction._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// GET CASH TRANSACTIONS (LIST)
// ---------------------------------------------------------------------------
const getCashTransactions = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await cashTransactionRepository.getCashTransactions(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    cashTransactions: result.cashTransactions.map((ct) => ct.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET CASH TRANSACTION BY ID
// ---------------------------------------------------------------------------
const getCashTransactionById = async (id, companyId, workspaceId) => {
  const cashTransaction =
    await cashTransactionRepository.findCashTransactionByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!cashTransaction) {
    throw new ApiError(404, "Cash Transaction not found");
  }
  return cashTransaction.toSafeObject();
};

// ---------------------------------------------------------------------------
// CANCEL CASH TRANSACTION
// ---------------------------------------------------------------------------
const cancelCashTransaction = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cashTransaction = await mongoose
      .model("CashTransaction")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cashTransaction) {
      throw new ApiError(404, "Cash Transaction not found");
    }

    if (cashTransaction.status === CASH_TRANSACTION_STATUS.CANCELLED) {
      throw new ApiError(400, "Cash Transaction is already cancelled");
    }

    await session.commitTransaction();
    session.endSession();

    // Reverse the journal voucher (manages its own session internally)
    if (
      cashTransaction.status === CASH_TRANSACTION_STATUS.POSTED &&
      cashTransaction.journalVoucherId
    ) {
      await journalCancellationService.cancelJournalVoucher(
        cashTransaction.journalVoucherId,
        companyId,
        workspaceId,
        userId,
      );
    }

    // Update the cash transaction status
    await mongoose.model("CashTransaction").updateOne(
      { _id: cashTransaction._id },
      {
        $set: {
          status: CASH_TRANSACTION_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: payload?.reason || null,
        },
      },
    );

    return getCashTransactionById(cashTransaction._id, companyId, workspaceId);
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_) { /* already committed or aborted */ }
    session.endSession();
    throw error;
  }
};

export default {
  createCashTransaction,
  getCashTransactions,
  getCashTransactionById,
  cancelCashTransaction,
};
