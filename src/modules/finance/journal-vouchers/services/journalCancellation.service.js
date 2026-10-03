import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import journalPostingService from "./journalPosting.service.js";
import { VOUCHER_STATUS } from "../constants/voucherStatus.constant.js";

const cancelJournalVoucher = async (
  voucherId,
  companyId,
  workspaceId,
  userId
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    if (
      voucher.status === VOUCHER_STATUS.CANCELLED ||
      voucher.status === VOUCHER_STATUS.REVERSED
    ) {
      throw new ApiError(400, "Voucher is already cancelled or reversed");
    }

    const lines = await journalLineRepository.findLinesByVoucherId(voucherId, {
      session,
    });

    if (voucher.status === VOUCHER_STATUS.POSTED) {
      // Revert account balances and delete ledger entries
      await journalPostingService.reverseJournalVoucherBalances(
        voucher,
        lines,
        companyId,
        workspaceId,
        { session }
      );
    }

    voucher.status = VOUCHER_STATUS.CANCELLED;
    await voucher.save({ session });

    await session.commitTransaction();
    session.endSession();

    const voucherObj = voucher.toSafeObject();
    voucherObj.lines = lines.map((l) => l.toSafeObject());
    return voucherObj;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  cancelJournalVoucher,
};
