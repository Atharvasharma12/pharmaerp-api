import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import journalNumberService from "./journalNumber.service.js";
import journalValidationService from "./journalValidation.service.js";
import journalPostingService from "./journalPosting.service.js";
import { calculateJournalTotals } from "../helpers/calculateJournalTotals.js";
import { buildJournalReference } from "../helpers/buildJournalReference.js";
import {
  JOURNAL_VOUCHER_STATUS,
  JOURNAL_VOUCHER_TYPE,
} from "../constants/journalVoucher.constant.js";

const createJournalVoucher = async (workspaceId, companyId, userId, payload) => {
  const { lines, voucherDate, voucherType, referenceNumber, narration, status } =
    payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate lines
    await journalValidationService.validateJournalLines(
      companyId,
      workspaceId,
      lines,
      voucherDate
    );

    // 2. Generate sequential number
    const voucherNumber = await journalNumberService.generateVoucherNumber(
      companyId,
      voucherType,
      { session }
    );

    // 3. Compute totals and reference
    const { totalDebit, totalCredit } = calculateJournalTotals(lines);
    const refNum = buildJournalReference(voucherType, referenceNumber);

    // 4. Create voucher header
    const voucherPayload = {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: new Date(voucherDate),
      voucherType,
      referenceNumber: refNum,
      narration: narration || null,
      totalDebit,
      totalCredit,
      status: JOURNAL_VOUCHER_STATUS.DRAFT, // Always created as DRAFT first
      createdBy: userId,
    };

    const voucher = await journalVoucherRepository.createVoucher(voucherPayload, {
      session,
    });

    // 5. Create lines
    const linesPayload = lines.map((line) => ({
      workspaceId,
      companyId,
      voucherId: voucher._id,
      accountId: line.accountId,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      narration: line.narration || null,
    }));

    const createdLines = await journalLineRepository.createLines(linesPayload, {
      session,
    });

    // 6. Post immediately if requested
    if (status === JOURNAL_VOUCHER_STATUS.POSTED) {
      await journalPostingService.postJournalVoucher(
        voucher._id,
        companyId,
        workspaceId,
        userId,
        { session }
      );
      voucher.status = JOURNAL_VOUCHER_STATUS.POSTED;
    }

    await session.commitTransaction();
    session.endSession();

    const voucherObj = voucher.toSafeObject();
    voucherObj.lines = createdLines.map((l) => l.toSafeObject());
    return voucherObj;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getJournalVouchers = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await journalVoucherRepository.getVouchers(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    vouchers: result.vouchers.map((v) => v.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getJournalVoucherById = async (voucherId, companyId, workspaceId) => {
  const voucher = await journalVoucherRepository.findVoucherByIdCompanyAndWorkspace(
    voucherId,
    companyId,
    workspaceId
  );

  if (!voucher) {
    throw new ApiError(404, "Journal Voucher not found");
  }

  const lines = await journalLineRepository.findLinesByVoucherId(voucherId);

  const voucherObj = voucher.toSafeObject();
  voucherObj.lines = lines.map((l) => l.toSafeObject());
  return voucherObj;
};

const updateJournalVoucher = async (
  voucherId,
  companyId,
  workspaceId,
  userId,
  payload
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
      voucher.status === JOURNAL_VOUCHER_STATUS.POSTED ||
      voucher.status === JOURNAL_VOUCHER_STATUS.CANCELLED
    ) {
      throw new ApiError(
        400,
        "Posted or Cancelled vouchers cannot be modified"
      );
    }

    const { lines, voucherDate, referenceNumber, narration, status } = payload;

    // Update lines if provided
    if (lines) {
      await journalValidationService.validateJournalLines(
        companyId,
        workspaceId,
        lines,
        voucherDate || voucher.voucherDate
      );

      const { totalDebit, totalCredit } = calculateJournalTotals(lines);
      voucher.totalDebit = totalDebit;
      voucher.totalCredit = totalCredit;

      // Delete existing lines and re-insert
      await journalLineRepository.deleteLinesByVoucherId(voucherId, { session });

      const linesPayload = lines.map((line) => ({
        workspaceId,
        companyId,
        voucherId,
        accountId: line.accountId,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        narration: line.narration || null,
      }));

      await journalLineRepository.createLines(linesPayload, { session });
    }

    if (voucherDate) {
      voucher.voucherDate = new Date(voucherDate);
    }

    if (referenceNumber !== undefined) {
      voucher.referenceNumber = referenceNumber ? referenceNumber.trim() : null;
    }

    if (narration !== undefined) {
      voucher.narration = narration ? narration.trim() : null;
    }

    await voucher.save({ session });

    // Handle posting if requested
    if (status === JOURNAL_VOUCHER_STATUS.POSTED) {
      await journalPostingService.postJournalVoucher(
        voucherId,
        companyId,
        workspaceId,
        userId,
        { session }
      );
      voucher.status = JOURNAL_VOUCHER_STATUS.POSTED;
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch fresh copy with populated lines
    return getJournalVoucherById(voucherId, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const postJournalVoucher = async (voucherId, companyId, workspaceId, userId) => {
  return journalPostingService.postJournalVoucher(
    voucherId,
    companyId,
    workspaceId,
    userId
  );
};

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

    if (voucher.status === JOURNAL_VOUCHER_STATUS.CANCELLED) {
      throw new ApiError(400, "Voucher is already cancelled");
    }

    if (voucher.status === JOURNAL_VOUCHER_STATUS.POSTED) {
      const lines = await journalLineRepository.findLinesByVoucherId(voucherId, {
        session,
      });

      // Reverse account balances
      await journalPostingService.reverseJournalVoucherBalances(
        voucher,
        lines,
        companyId,
        workspaceId,
        { session }
      );
    }

    voucher.status = JOURNAL_VOUCHER_STATUS.CANCELLED;
    await voucher.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getJournalVoucherById(voucherId, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  createJournalVoucher,
  getJournalVouchers,
  getJournalVoucherById,
  updateJournalVoucher,
  postJournalVoucher,
  cancelJournalVoucher,
};
