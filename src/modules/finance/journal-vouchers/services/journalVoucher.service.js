import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import voucherNumberService from "./voucherNumber.service.js";
import journalValidationService from "./journalValidation.service.js";
import journalPostingService from "./journalPosting.service.js";
import journalCancellationService from "./journalCancellation.service.js";
import journalApprovalService from "./journalApproval.service.js";
import journalReversalService from "./journalReversal.service.js";
import { calculateJournalTotals } from "../helpers/calculateJournalTotals.js";
import { buildJournalReference } from "../helpers/buildJournalReference.js";
import { normalizeJournalLines } from "../helpers/normalizeJournalLines.js";
import { validateVoucherDate } from "../helpers/validateVoucherDate.js";
import { VOUCHER_TYPE } from "../constants/voucherType.constant.js";
import { VOUCHER_STATUS } from "../constants/voucherStatus.constant.js";

const createJournalVoucher = async (workspaceId, companyId, userId, payload) => {
  const { lines, voucherDate, voucherType, referenceNumber, narration, status } =
    payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Normalize and round line amounts
    const normalizedLines = normalizeJournalLines(lines);

    // 2. Validate voucher date
    const parsedDate = validateVoucherDate(voucherDate);

    // 3. Validate lines
    await journalValidationService.validateJournalLines(
      companyId,
      workspaceId,
      normalizedLines,
      parsedDate
    );

    // 4. Generate sequential voucher number atomically
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      workspaceId,
      voucherType,
      { session }
    );

    // 5. Compute totals and reference
    const { totalDebit, totalCredit } = calculateJournalTotals(normalizedLines);
    const refNum = buildJournalReference(voucherType, referenceNumber);

    // 6. Create voucher header
    const voucherPayload = {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: parsedDate,
      voucherType,
      referenceNumber: refNum,
      narration: narration || null,
      totalDebit,
      totalCredit,
      status: VOUCHER_STATUS.DRAFT, // Always created as DRAFT
      createdBy: userId,
    };

    const voucher = await journalVoucherRepository.createVoucher(voucherPayload, {
      session,
    });

    // 7. Create lines
    const linesPayload = normalizedLines.map((line) => ({
      workspaceId,
      companyId,
      voucherId: voucher._id,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      narration: line.narration || null,
    }));

    const createdLines = await journalLineRepository.createLines(linesPayload, {
      session,
    });

    // 8. Post immediately if requested
    if (status === VOUCHER_STATUS.POSTED) {
      await journalPostingService.postJournalVoucher(
        voucher._id,
        companyId,
        workspaceId,
        userId,
        { session }
      );
      voucher.status = VOUCHER_STATUS.POSTED;
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
      voucher.status === VOUCHER_STATUS.POSTED ||
      voucher.status === VOUCHER_STATUS.CANCELLED ||
      voucher.status === VOUCHER_STATUS.REVERSED
    ) {
      throw new ApiError(
        400,
        "Posted, Cancelled, or Reversed vouchers cannot be modified"
      );
    }

    const { lines, voucherDate, referenceNumber, narration, status } = payload;

    const parsedDate = voucherDate ? validateVoucherDate(voucherDate) : voucher.voucherDate;

    // Update lines if provided
    if (lines) {
      const normalizedLines = normalizeJournalLines(lines);

      await journalValidationService.validateJournalLines(
        companyId,
        workspaceId,
        normalizedLines,
        parsedDate
      );

      const { totalDebit, totalCredit } = calculateJournalTotals(normalizedLines);
      voucher.totalDebit = totalDebit;
      voucher.totalCredit = totalCredit;

      // Delete existing lines and re-insert
      await journalLineRepository.deleteLinesByVoucherId(voucherId, { session });

      const linesPayload = normalizedLines.map((line) => ({
        workspaceId,
        companyId,
        voucherId,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        narration: line.narration || null,
      }));

      await journalLineRepository.createLines(linesPayload, { session });
    }

    if (voucherDate) {
      voucher.voucherDate = parsedDate;
    }

    if (referenceNumber !== undefined) {
      voucher.referenceNumber = referenceNumber ? referenceNumber.trim() : null;
    }

    if (narration !== undefined) {
      voucher.narration = narration ? narration.trim() : null;
    }

    await voucher.save({ session });

    // Handle posting if requested
    if (status === VOUCHER_STATUS.POSTED) {
      await journalPostingService.postJournalVoucher(
        voucherId,
        companyId,
        workspaceId,
        userId,
        { session }
      );
      voucher.status = VOUCHER_STATUS.POSTED;
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
  return journalCancellationService.cancelJournalVoucher(
    voucherId,
    companyId,
    workspaceId,
    userId
  );
};

const submitForApproval = async (voucherId, companyId, workspaceId, userId) => {
  return journalApprovalService.submitForApproval(
    voucherId,
    companyId,
    workspaceId,
    userId
  );
};

const approveJournalVoucher = async (voucherId, companyId, workspaceId, userId) => {
  return journalApprovalService.approveJournalVoucher(
    voucherId,
    companyId,
    workspaceId,
    userId
  );
};

const reverseJournalVoucher = async (voucherId, companyId, workspaceId, userId) => {
  return journalReversalService.reverseJournalVoucher(
    voucherId,
    companyId,
    workspaceId,
    userId
  );
};

export default {
  createJournalVoucher,
  getJournalVouchers,
  getJournalVoucherById,
  updateJournalVoucher,
  postJournalVoucher,
  cancelJournalVoucher,
  submitForApproval,
  approveJournalVoucher,
  reverseJournalVoucher,
};
