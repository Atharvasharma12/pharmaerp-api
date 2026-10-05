import mongoose from "mongoose";
import ApiError from "../../../../../utils/ApiError.js";
import fundTransferRepository from "../repositories/fundTransfer.repository.js";
import {
  FUND_TRANSFER_TYPE,
  FUND_TRANSFER_STATUS,
} from "../constants/fundTransfer.constant.js";

import BankAccount from "../../bank-management/bank-accounts/models/bankAccount.model.js";
import BranchCash from "../../cash-management/branch-cash/models/branchCash.model.js";

import journalLineRepository from "../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../journal-vouchers/services/journalPosting.service.js";
import journalCancellationService from "../../../journal-vouchers/services/journalCancellation.service.js";
import { VOUCHER_TYPE } from "../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../journal-vouchers/services/voucherNumber.service.js";
import journalVoucherRepository from "../../../journal-vouchers/repositories/journalVoucher.repository.js";
import cashDenominationRepository from "../../cash-management/cash-denominations/repositories/cashDenomination.repository.js";
import { CASH_DENOMINATION_STATUS } from "../../cash-management/cash-denominations/constants/cashDenomination.constant.js";
import branchCashRepository from "../../cash-management/branch-cash/repositories/branchCash.repository.js";

/**
 * Resolve the ledger Account ID from either a BankAccount or CashAccount.
 */
const resolveLedgerAccountId = async (accountType, accountId, session) => {
  if (accountType === "BANK") {
    const bankAccount = await BankAccount.findOne({
      _id: accountId,
      isDeleted: false,
      isActive: true,
    }).session(session);
    if (!bankAccount)
      throw new ApiError(400, `Bank Account not found or inactive`);
    return bankAccount.ledgerAccountId;
  }

  if (accountType === "CASH") {
    const branchCash = await BranchCash.findOne({
      branchId: accountId,
      isDeleted: false,
      isActive: true,
    }).session(session);
    if (!branchCash)
      throw new ApiError(400, `Branch Cash not found or inactive`);
    return branchCash.ledgerAccountId;
  }

  throw new ApiError(400, "Invalid account type. Must be BANK or CASH");
};

/**
 * Derive FUND_TRANSFER_TYPE enum from fromAccountType and toAccountType.
 */
const deriveTransferType = (fromAccountType, toAccountType) => {
  if (fromAccountType === "BANK" && toAccountType === "BANK")
    return FUND_TRANSFER_TYPE.BANK_TO_BANK;
  if (fromAccountType === "CASH" && toAccountType === "BANK")
    return FUND_TRANSFER_TYPE.CASH_TO_BANK;
  if (fromAccountType === "BANK" && toAccountType === "CASH")
    return FUND_TRANSFER_TYPE.BANK_TO_CASH;
  if (fromAccountType === "CASH" && toAccountType === "CASH")
    return FUND_TRANSFER_TYPE.CASH_TO_CASH;
  throw new ApiError(400, "Invalid account type combination");
};

// ---------------------------------------------------------------------------
// CREATE FUND TRANSFER
// ---------------------------------------------------------------------------
const createFundTransfer = async (workspaceId, companyId, userId, payload) => {
  const {
    transferDate,
    fromAccountType,
    fromAccountId,
    toAccountType,
    toAccountId,
    amount,
    referenceNumber,
    narration,
    fromDenominations,
    toDenominations,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Prevent self-transfer
    if (
      fromAccountType === toAccountType &&
      String(fromAccountId) === String(toAccountId)
    ) {
      throw new ApiError(
        400,
        "Source and destination accounts cannot be the same",
      );
    }

    // 1b. PRE-FLIGHT: If FROM account is CASH, validate denomination sufficiency before anything
    if (
      fromAccountType === "CASH" &&
      fromDenominations &&
      fromDenominations.length > 0
    ) {
      const processedFrom = fromDenominations.map((d) => ({
        denomination: d.denomination,
        quantity: d.quantity || 0,
        subtotal: d.denomination * (d.quantity || 0),
      }));
      await branchCashRepository.validateSufficientRunningDenominations(
        fromAccountId,
        companyId,
        processedFrom,
        { session },
      );
    }

    // 2. Resolve ledger accounts for both ends
    const fromLedgerAccountId = await resolveLedgerAccountId(
      fromAccountType,
      fromAccountId,
      session,
    );
    const toLedgerAccountId = await resolveLedgerAccountId(
      toAccountType,
      toAccountId,
      session,
    );

    // 3. Derive transfer type
    const transferType = deriveTransferType(fromAccountType, toAccountType);

    // 4. Generate unique transfer number
    const transferNumber = await fundTransferRepository.getNextTransferNumber(
      companyId,
      workspaceId,
      { session },
    );

    // 5. Generate CONTRA journal voucher number
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      workspaceId,
      VOUCHER_TYPE.CONTRA,
      { session },
    );

    // 6. Create the CONTRA journal voucher
    const voucherNarration =
      narration ||
      `Fund Transfer ${transferNumber}: ${fromAccountType} → ${toAccountType}`;

    const journalVoucher = await journalVoucherRepository.createVoucher(
      {
        workspaceId,
        companyId,
        voucherNumber,
        voucherDate: new Date(transferDate),
        voucherType: VOUCHER_TYPE.CONTRA,
        referenceNumber: referenceNumber || null,
        narration: voucherNarration,
        totalDebit: amount,
        totalCredit: amount,
        createdBy: userId,
      },
      { session },
    );

    // 7. Create journal lines
    // Destination A/c Dr (money coming in)
    // Source A/c Cr (money going out)
    await journalLineRepository.createLines(
      [
        {
          workspaceId,
          companyId,
          voucherId: journalVoucher._id,
          accountId: toLedgerAccountId,
          debit: amount,
          credit: 0,
          narration: voucherNarration,
        },
        {
          workspaceId,
          companyId,
          voucherId: journalVoucher._id,
          accountId: fromLedgerAccountId,
          debit: 0,
          credit: amount,
          narration: voucherNarration,
        },
      ],
      { session },
    );

    // 8. Post the journal voucher immediately (fund transfers auto-post)
    await journalPostingService.postJournalVoucher(
      journalVoucher._id,
      companyId,
      workspaceId,
      userId,
      { session },
    );

    // 9. Auto-link to open shift / day closing and resolve branchId
    // Determine which cash account to use for shift detection (prefer FROM, fallback TO)
    let resolvedShiftId = payload.shiftId || null;
    let resolvedBranchId = null;

    const primaryBranchId =
      fromAccountType === "CASH" ? fromAccountId
      : toAccountType === "CASH" ? toAccountId
      : null;

    if (primaryBranchId) {
      resolvedBranchId = primaryBranchId;
    }

    // If shiftId not explicitly provided, auto-detect the currently open shift for this branch
    if (!resolvedShiftId && resolvedBranchId) {
      try {
        const { Shift } = await import("../../../../operations/shifts/shift.model.js");
        const openShift = await Shift.findOne({
          companyId,
          workspaceId,
          branchId: resolvedBranchId,
          status: "open",
        }).select("_id").session(session);
        if (openShift) resolvedShiftId = openShift._id;
      } catch (shiftErr) {
        // Non-fatal: if shift lookup fails, transfer still saves without shiftId
        console.warn("[FundTransfer] Could not auto-link shift:", shiftErr.message);
      }
    }

    // If businessDayId not explicitly provided, auto-detect open Business Day for this branch
    let resolvedBusinessDayId = payload.businessDayId || null;
    if (!resolvedBusinessDayId && resolvedBranchId) {
      try {
        const { BusinessDay } = await import("../../../../operations/business-days/businessDay.model.js");
        const openDay = await BusinessDay.findOne({
          companyId,
          workspaceId,
          branchId: resolvedBranchId,
          status: "open",
        }).select("_id").session(session);
        if (openDay) resolvedBusinessDayId = openDay._id;
      } catch (bdErr) {
        // Non-fatal: fund transfer proceeds even if Business Day link fails
        console.warn("[FundTransfer] Could not auto-link business day:", bdErr.message);
      }
    }

    // 10. Save the Fund Transfer record
    const fundTransferPayload = {
      workspaceId,
      companyId,
      branchId: resolvedBranchId,
      shiftId: resolvedShiftId,
      businessDayId: resolvedBusinessDayId,
      transferNumber,
      transferDate: new Date(transferDate),
      transferType,
      fromAccountType,
      fromBankAccountId: fromAccountType === "BANK" ? fromAccountId : null,
      toAccountType,
      toBankAccountId: toAccountType === "BANK" ? toAccountId : null,
      amount,
      referenceNumber: referenceNumber || null,
      narration: narration || null,
      journalVoucherId: journalVoucher._id,
      status: FUND_TRANSFER_STATUS.POSTED,
      postedAt: new Date(),
      postedBy: userId,
      createdBy: userId,
    };

    // 10. Create denomination records for cash sides of the transfer
    // Returns { id, countNumber, physicalTotal, denominations } so the snapshot
    // can be written without an extra getNextCountNumber call.
    const buildDenomRecord = async (denominations, cashAccountId) => {
      if (!denominations || denominations.length === 0) return null;

      const processedDenominations = denominations.map((d) => ({
        denomination: d.denomination,
        quantity: d.quantity || 0,
        subtotal: d.denomination * (d.quantity || 0),
      }));

      const physicalTotal = processedDenominations.reduce(
        (sum, d) => sum + d.subtotal,
        0,
      );


      const countNumber = await cashDenominationRepository.getNextCountNumber(
        companyId,
        workspaceId,
        { session },
      );

      const record = await cashDenominationRepository.createCashDenomination(
        {
          workspaceId,
          companyId,
          cashAccountId: null,
          branchId: cashAccountId,
          countNumber,
          countDate: new Date(transferDate),
          denominations: processedDenominations,
          physicalTotal,
          expectedBalance: amount,
          variance: 0,
          narration:
            narration || `Fund Transfer ${transferNumber} - denomination count`,
          status: CASH_DENOMINATION_STATUS.CONFIRMED,
          confirmedAt: new Date(),
          confirmedBy: userId,
          createdBy: userId,
        },
        { session },
      );
      return {
        id: record._id,
        countNumber,
        physicalTotal,
        denominations: processedDenominations,
      };
    };

    if (
      fromAccountType === "CASH" &&
      fromDenominations &&
      fromDenominations.length > 0
    ) {
      const result = await buildDenomRecord(fromDenominations, fromAccountId);
      if (result) {
        fundTransferPayload.fromCashDenominationId = result.id;
        // subtractRunningDenominations recomputes runningTotal from denomination sums
        await branchCashRepository.subtractRunningDenominations(
          fromAccountId,
          companyId,
          result.denominations,
          userId,
          { session },
        );
      }
    }
    if (
      toAccountType === "CASH" &&
      toDenominations &&
      toDenominations.length > 0
    ) {
      const result = await buildDenomRecord(toDenominations, toAccountId);
      if (result) {
        fundTransferPayload.toCashDenominationId = result.id;
        // addRunningDenominations recomputes runningTotal from denomination sums
        await branchCashRepository.addRunningDenominations(
          toAccountId,
          companyId,
          result.denominations,
          userId,
          { session },
        );
      }
    }

    const fundTransfer = await fundTransferRepository.createFundTransfer(
      fundTransferPayload,
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getFundTransferById(fundTransfer._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// GET FUND TRANSFERS (LIST)
// ---------------------------------------------------------------------------
const getFundTransfers = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await fundTransferRepository.getFundTransfers(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    fundTransfers: result.fundTransfers.map((ft) => ft.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET FUND TRANSFER BY ID
// ---------------------------------------------------------------------------
const getFundTransferById = async (id, companyId, workspaceId) => {
  const fundTransfer =
    await fundTransferRepository.findFundTransferByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!fundTransfer) {
    throw new ApiError(404, "Fund Transfer not found");
  }
  return fundTransfer.toSafeObject();
};

// ---------------------------------------------------------------------------
// CANCEL FUND TRANSFER
// ---------------------------------------------------------------------------
const cancelFundTransfer = async (
  id,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fundTransfer = await mongoose
      .model("FundTransfer")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!fundTransfer) {
      throw new ApiError(404, "Fund Transfer not found");
    }

    if (fundTransfer.status === FUND_TRANSFER_STATUS.CANCELLED) {
      throw new ApiError(400, "Fund Transfer is already cancelled");
    }

    // Reverse the journal voucher if it was posted
    if (
      fundTransfer.status === FUND_TRANSFER_STATUS.POSTED &&
      fundTransfer.journalVoucherId
    ) {
      await journalCancellationService.cancelJournalVoucher(
        fundTransfer.journalVoucherId,
        companyId,
        workspaceId,
        userId,
      );
    }

    fundTransfer.status = FUND_TRANSFER_STATUS.CANCELLED;
    fundTransfer.cancelledAt = new Date();
    fundTransfer.cancelledBy = userId;
    fundTransfer.cancellationReason = payload?.reason || null;
    await fundTransfer.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getFundTransferById(fundTransfer._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  createFundTransfer,
  getFundTransfers,
  getFundTransferById,
  cancelFundTransfer,
};
