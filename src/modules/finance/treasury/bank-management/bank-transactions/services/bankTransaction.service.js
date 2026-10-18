import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import bankTransactionRepository from "../repositories/bankTransaction.repository.js";
import {
  BANK_TRANSACTION_DIRECTION,
  BANK_TRANSACTION_STATUS,
} from "../constants/bankTransaction.constant.js";

import BankAccount from "../../bank-accounts/models/bankAccount.model.js";
import Account from "../../../../chart-of-accounts/models/account.model.js";
import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import journalVoucherRepository from "../../../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../../journal-vouchers/services/journalPosting.service.js";
import journalCancellationService from "../../../../journal-vouchers/services/journalCancellation.service.js";
import { VOUCHER_TYPE } from "../../../../journal-vouchers/constants/voucherType.constant.js";
import { VOUCHER_STATUS } from "../../../../journal-vouchers/constants/voucherStatus.constant.js";
import voucherNumberService from "../../../../journal-vouchers/services/voucherNumber.service.js";

/**
 * Determine the journal voucher type based on transaction direction.
 * CREDIT (money in) → RECEIPT
 * DEBIT  (money out) → PAYMENT
 * Charges/Interest  → JOURNAL
 */
const resolveVoucherType = (transactionType) => {
  const receiptTypes = [
    "DEPOSIT",
    "NEFT",
    "RTGS",
    "IMPS",
    "UPI",
    "CHEQUE",
    "INTEREST",
  ];
  const paymentTypes = ["WITHDRAWAL"];
  const journalTypes = ["BANK_CHARGES", "OTHER"];

  if (receiptTypes.includes(transactionType)) return VOUCHER_TYPE.JOURNAL;
  if (paymentTypes.includes(transactionType)) return VOUCHER_TYPE.JOURNAL;
  if (journalTypes.includes(transactionType)) return VOUCHER_TYPE.JOURNAL;
  return VOUCHER_TYPE.JOURNAL;
};

import findOrCreateSystemAccount from "../../../shared/findOrCreateSystemAccount.js";

// ---------------------------------------------------------------------------
// CREATE BANK TRANSACTION
// ---------------------------------------------------------------------------
const createBankTransaction = async (
  workspaceId,
  companyId,
  userId,
  payload,
  options = {},
) => {
  const {
    transactionDate,
    bankAccountId,
    transactionType,
    direction,
    amount,
    referenceNumber,
    narration,
    counterpartyAccountId,
  } = payload;

  const providedSession = options.session;
  const session = providedSession || await mongoose.startSession();
  
  if (!providedSession) {
    session.startTransaction();
  }

  try {
    // 1. Verify BankAccount exists and is active
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      companyId,
      workspaceId,
      isDeleted: false,
      isActive: true,
    }).session(session);

    if (!bankAccount) {
      throw new ApiError(400, "Bank Account not found or inactive");
    }

    const bankLedgerAccountId = bankAccount.ledgerAccountId;

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
      if (transactionType === "BANK_CHARGES") {
        const chargesAccount = await findOrCreateSystemAccount(
          workspaceId,
          companyId,
          userId,
          "BANK_CHARGES",
          "Bank Charges",
          "EXPENSE",
          "EXPENSE",
          "BANK_CHARGES_GRP",
          "Bank Charges",
          session,
        );
        offsetLedgerAccountId = chargesAccount._id;
      } else if (transactionType === "INTEREST") {
        const interestAccount = await findOrCreateSystemAccount(
          workspaceId,
          companyId,
          userId,
          "BANK_INTEREST_INC",
          "Bank Interest Income",
          "INCOME",
          "INCOME",
          "BANK_INTEREST_GRP",
          "Bank Interest",
          session,
        );
        offsetLedgerAccountId = interestAccount._id;
      } else {
        // For DEPOSIT, WITHDRAWAL, NEFT, RTGS, IMPS, UPI, CHEQUE, OTHER
        // we require counterpartyAccountId from the user
        throw new ApiError(
          400,
          `counterpartyAccountId is required for transaction type: ${transactionType}`,
        );
      }
    }

    // 3. Generate unique transaction number
    const transactionNumber =
      await bankTransactionRepository.getNextTransactionNumber(
        companyId,
        workspaceId,
        { session },
      );

    // 4. Generate journal voucher number
    const voucherType = resolveVoucherType(transactionType);
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      workspaceId,
      voucherType,
      { session },
    );

    const txNarration =
      narration || `${transactionType} - ${transactionNumber}`;

    // 5. Build journal lines
    // CREDIT direction: Bank A/c Dr, Offset A/c Cr (money comes in to bank)
    // DEBIT  direction: Offset A/c Dr, Bank A/c Cr (money goes out of bank)
    let lines;
    if (direction === BANK_TRANSACTION_DIRECTION.CREDIT) {
      lines = [
        {
          workspaceId,
          companyId,
          accountId: bankLedgerAccountId,
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
          accountId: bankLedgerAccountId,
          debit: 0,
          credit: amount,
          narration: txNarration,
        },
      ];
    }

    const isPendingShiftClose = payload.status === BANK_TRANSACTION_STATUS.PENDING_SHIFT_CLOSE;

    // 6. Create journal voucher (DRAFT if held for shift close, else POSTED)
    const journalVoucher = await journalVoucherRepository.createVoucher(
      {
        workspaceId,
        companyId,
        voucherNumber,
        voucherDate: new Date(transactionDate),
        voucherType,
        referenceNumber: referenceNumber || null,
        narration: txNarration,
        totalDebit: amount,
        totalCredit: amount,
        createdBy: userId,
        status: isPendingShiftClose ? VOUCHER_STATUS.DRAFT : VOUCHER_STATUS.POSTED,
      },
      { session },
    );

    // 7. Add voucherId to lines and save
    const linesWithVoucher = lines.map((l) => ({
      ...l,
      voucherId: journalVoucher._id,
    }));
    await journalLineRepository.createLines(linesWithVoucher, { session });

    // 8. Post the voucher immediately ONLY if not held for shift close
    if (!isPendingShiftClose) {
      await journalPostingService.postJournalVoucher(
        journalVoucher._id,
        companyId,
        workspaceId,
        userId,
        { session },
      );
    }

    // 9. Save the Bank Transaction record
    const txPayload = {
      workspaceId,
      companyId,
      transactionNumber,
      transactionDate: new Date(transactionDate),
      bankAccountId,
      transactionType,
      direction,
      amount,
      referenceNumber: referenceNumber || null,
      narration: narration || null,
      counterpartyAccountId: offsetLedgerAccountId,
      journalVoucherId: journalVoucher._id,
      shiftId: payload.shiftId || null,
      status: payload.status || BANK_TRANSACTION_STATUS.POSTED,
      postedAt: payload.status === BANK_TRANSACTION_STATUS.PENDING_SHIFT_CLOSE ? null : new Date(),
      postedBy: payload.status === BANK_TRANSACTION_STATUS.PENDING_SHIFT_CLOSE ? null : userId,
      createdBy: userId,
    };

    const bankTransaction =
      await bankTransactionRepository.createBankTransaction(txPayload, {
        session,
      });

    if (!providedSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return getBankTransactionById(bankTransaction._id, companyId, workspaceId);
  } catch (error) {
    if (!providedSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

// ---------------------------------------------------------------------------
// GET BANK TRANSACTIONS (LIST)
// ---------------------------------------------------------------------------
const getBankTransactions = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, sortBy, sortOrder, ...filters } = query;
  const result = await bankTransactionRepository.getBankTransactions(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true, sortBy, sortOrder },
  );

  return {
    bankTransactions: result.bankTransactions.map((bt) =>
      bt.toSafeObject ? bt.toSafeObject() : bt,
    ),
    total: result.total,
    page: result.page,
    limit: result.limit,
    summary: result.summary,
  };
};

// ---------------------------------------------------------------------------
// GET BANK TRANSACTION BY ID
// ---------------------------------------------------------------------------
const getBankTransactionById = async (id, companyId, workspaceId) => {
  const bankTransaction =
    await bankTransactionRepository.findBankTransactionByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!bankTransaction) {
    throw new ApiError(404, "Bank Transaction not found");
  }
  return bankTransaction.toSafeObject();
};

// ---------------------------------------------------------------------------
// CANCEL BANK TRANSACTION
// ---------------------------------------------------------------------------
const cancelBankTransaction = async (
  id,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bankTransaction = await mongoose
      .model("BankTransaction")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!bankTransaction) {
      throw new ApiError(404, "Bank Transaction not found");
    }

    if (bankTransaction.status === BANK_TRANSACTION_STATUS.CANCELLED) {
      throw new ApiError(400, "Bank Transaction is already cancelled");
    }

    await session.commitTransaction();
    session.endSession();

    // Reverse the journal voucher (manages its own session internally)
    if (
      bankTransaction.status === BANK_TRANSACTION_STATUS.POSTED &&
      bankTransaction.journalVoucherId
    ) {
      await journalCancellationService.cancelJournalVoucher(
        bankTransaction.journalVoucherId,
        companyId,
        workspaceId,
        userId,
      );
    }

    // Update the bank transaction status
    await mongoose.model("BankTransaction").updateOne(
      { _id: bankTransaction._id },
      {
        $set: {
          status: BANK_TRANSACTION_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: payload?.reason || null,
        },
      },
    );

    return getBankTransactionById(bankTransaction._id, companyId, workspaceId);
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_) {
      /* already committed or aborted */
    }
    session.endSession();
    throw error;
  }
};

export default {
  createBankTransaction,
  getBankTransactions,
  getBankTransactionById,
  cancelBankTransaction,
};
