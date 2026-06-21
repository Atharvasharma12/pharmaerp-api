import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import accountBalanceRepository from "../../account-balances/repositories/accountBalance.repository.js";
import ledgerService from "../../ledger/services/ledger.service.js";
import { JOURNAL_VOUCHER_STATUS } from "../constants/journalVoucher.constant.js";

const postJournalVoucher = async (voucherId, companyId, workspaceId, userId, options = {}) => {
  const session = options.session || (await mongoose.startSession());
  const runInOuterSession = !!options.session;

  if (!runInOuterSession) {
    session.startTransaction();
  }

  try {
    const voucher = await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
      voucherId,
      companyId,
      workspaceId,
      { session }
    );

    if (!voucher) {
      throw new ApiError(404, "Journal Voucher not found");
    }

    if (voucher.status === JOURNAL_VOUCHER_STATUS.POSTED) {
      throw new ApiError(400, "Journal Voucher is already posted");
    }

    if (voucher.status === JOURNAL_VOUCHER_STATUS.CANCELLED) {
      throw new ApiError(400, "Cancelled Journal Vouchers cannot be posted");
    }

    const lines = await journalLineRepository.findLinesByVoucherId(voucherId, { session });
    if (!lines || lines.length < 2) {
      throw new ApiError(400, "Voucher has insufficient lines to post");
    }

    const postingDate = voucher.voucherDate || new Date();

    // Process and accumulate account balances & write ledger entries
    for (const line of lines) {
      const debitChange = line.debit || 0;
      const creditChange = line.credit || 0;

      await accountBalanceRepository.accumulateBalance(
        line.accountId,
        companyId,
        workspaceId,
        debitChange,
        creditChange,
        postingDate
      );

      // Create ledger entry document
      await ledgerService.createLedgerEntry(session, {
        workspaceId,
        companyId,
        accountId: line.accountId,
        voucherId: voucher._id,
        voucherNumber: voucher.voucherNumber,
        voucherDate: postingDate,
        debit: debitChange,
        credit: creditChange,
        narration: line.narration || voucher.narration || "Journal entry posting",
      });

      // Recalculate chronological running balances for the account
      await ledgerService.recalculateLedger(line.accountId, companyId, workspaceId, {
        session,
      });
    }

    voucher.status = JOURNAL_VOUCHER_STATUS.POSTED;
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

    await accountBalanceRepository.accumulateBalance(
      line.accountId,
      companyId,
      workspaceId,
      debitChange,
      creditChange,
      postingDate
    );

    // Re-calculate running balances now that the entries are removed
    await ledgerService.recalculateLedger(line.accountId, companyId, workspaceId, {
      session,
    });
  }
};

export default {
  postJournalVoucher,
  reverseJournalVoucherBalances,
};

