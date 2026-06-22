import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import voucherNumberService from "./voucherNumber.service.js";
import journalPostingService from "./journalPosting.service.js";
import { VOUCHER_STATUS } from "../constants/voucherStatus.constant.js";
import { VOUCHER_TYPE } from "../constants/voucherType.constant.js";

const reverseJournalVoucher = async (
  voucherId,
  companyId,
  workspaceId,
  userId
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const originalVoucher = await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
      voucherId,
      companyId,
      workspaceId,
      { session }
    );

    if (!originalVoucher) {
      throw new ApiError(404, "Original Journal Voucher not found");
    }

    if (originalVoucher.status !== VOUCHER_STATUS.POSTED) {
      throw new ApiError(400, "Only posted journal vouchers can be reversed");
    }

    const originalLines = await journalLineRepository.findLinesByVoucherId(
      voucherId,
      { session }
    );

    if (!originalLines || originalLines.length < 2) {
      throw new ApiError(400, "Original voucher lines not found or invalid");
    }

    // 1. Generate unique voucher number for reversal
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      workspaceId,
      VOUCHER_TYPE.JOURNAL,
      { session }
    );

    // 2. Create Reversal Voucher Header
    const reversalPayload = {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: new Date(),
      voucherType: VOUCHER_TYPE.JOURNAL,
      referenceNumber: `REV-${originalVoucher.voucherNumber}`,
      narration: `Reversal entry for voucher ${originalVoucher.voucherNumber}. Reason: Adjustment.`,
      totalDebit: originalVoucher.totalDebit,
      totalCredit: originalVoucher.totalCredit,
      status: VOUCHER_STATUS.DRAFT, // Created as draft, then posted
      createdBy: userId,
    };

    const reversalVoucher = await journalVoucherRepository.createVoucher(
      reversalPayload,
      { session }
    );

    // 3. Reverse lines: swap debits and credits
    const reversalLinesPayload = originalLines.map((line) => ({
      workspaceId,
      companyId,
      voucherId: reversalVoucher._id,
      accountId: line.accountId,
      debit: line.credit, // swap
      credit: line.debit, // swap
      narration: `Reversal offset of line item`,
    }));

    const createdLines = await journalLineRepository.createLines(
      reversalLinesPayload,
      { session }
    );

    // 4. Post the reversal voucher to apply ledger offsets
    await journalPostingService.postJournalVoucher(
      reversalVoucher._id,
      companyId,
      workspaceId,
      userId,
      { session }
    );

    // 5. Update original voucher status to REVERSED
    originalVoucher.status = VOUCHER_STATUS.REVERSED;
    await originalVoucher.save({ session });

    await session.commitTransaction();
    session.endSession();

    const result = reversalVoucher.toSafeObject();
    result.lines = createdLines.map((l) => l.toSafeObject());
    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  reverseJournalVoucher,
};
