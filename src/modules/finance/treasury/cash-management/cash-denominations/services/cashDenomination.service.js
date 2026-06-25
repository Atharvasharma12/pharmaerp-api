import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashDenominationRepository from "../repositories/cashDenomination.repository.js";
import { CASH_DENOMINATION_STATUS } from "../constants/cashDenomination.constant.js";

import CashAccount from "../../cash-accounts/models/cashAccount.model.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import journalVoucherRepository from "../../../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../../journal-vouchers/services/journalPosting.service.js";
import { VOUCHER_TYPE } from "../../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../../journal-vouchers/services/voucherNumber.service.js";

// ---------------------------------------------------------------------------
// HELPER — get ledger balance for a cash account
// ---------------------------------------------------------------------------
const getLedgerBalance = async (cashAccount, companyId, session) => {
  // We return expectedBalance from the cash account's opening balance as a
  // starting point; real-time balance comes from the account balance module.
  // For now we return the openingBalance as a base — the frontend/reports
  // module will provide the live balance. Service accepts it from the payload.
  return cashAccount.openingBalance || 0;
};

// ---------------------------------------------------------------------------
// HELPER — find or auto-create system account for cash variance adjustment
// ---------------------------------------------------------------------------
const findOrCreateVarianceAccount = async (
  workspaceId,
  companyId,
  userId,
  isShortage,
  session,
) => {
  const code = isShortage ? "CASH_SHORTAGE" : "CASH_SURPLUS";
  const name = isShortage ? "Cash Shortage" : "Cash Surplus";
  const nature = isShortage ? "EXPENSE" : "INCOME";
  const groupCode = isShortage ? "CASH_SHORTAGE_GRP" : "CASH_SURPLUS_GRP";
  const groupName = isShortage ? "Cash Shortages" : "Cash Surplus";

  let account = await accountRepository.findAccountByCode(companyId, code, { session });
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
        nature,
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
      accountCode: code,
      accountName: name,
      accountGroupId: group._id,
      accountNature: nature,
      accountCategory: nature,
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
// 1. CREATE CASH DENOMINATION (Status: DRAFT)
//    Records the denomination count. No journal entry yet.
//    physicalTotal and variance are calculated from the denominations array.
// ---------------------------------------------------------------------------
const createCashDenomination = async (workspaceId, companyId, userId, payload) => {
  const {
    cashAccountId,
    countDate,
    denominations,
    expectedBalance,
    narration,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify cash account
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

    // 2. Calculate subtotals and physicalTotal from denominations array
    const processedDenominations = (denominations || []).map((d) => ({
      denomination: d.denomination,
      quantity: d.quantity || 0,
      subtotal: d.denomination * (d.quantity || 0),
    }));

    const physicalTotal = processedDenominations.reduce(
      (sum, d) => sum + d.subtotal,
      0,
    );

    // 3. Calculate variance: positive = excess, negative = shortage
    const expBal = Number(expectedBalance) || 0;
    const variance = physicalTotal - expBal;

    // 4. Generate count number
    const countNumber = await cashDenominationRepository.getNextCountNumber(
      companyId,
      workspaceId,
      { session },
    );

    // 5. Create the record
    const cashDenomination = await cashDenominationRepository.createCashDenomination(
      {
        workspaceId,
        companyId,
        cashAccountId,
        countNumber,
        countDate: new Date(countDate),
        denominations: processedDenominations,
        physicalTotal,
        expectedBalance: expBal,
        variance,
        narration: narration || null,
        status: CASH_DENOMINATION_STATUS.DRAFT,
        createdBy: userId,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getCashDenominationById(cashDenomination._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 2. CONFIRM CASH DENOMINATION (DRAFT → CONFIRMED)
//    If variance exists AND adjustVariance=true, creates a journal entry:
//
//    Cash SHORTAGE (physical < expected):
//      Cash Shortage Expense A/c Dr
//      Cash A/c Cr
//
//    Cash SURPLUS (physical > expected):
//      Cash A/c Dr
//      Cash Surplus Income A/c Cr
//
//    If variance = 0 OR adjustVariance=false → confirm with no journal
// ---------------------------------------------------------------------------
const confirmCashDenomination = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cashDenomination = await mongoose
      .model("CashDenomination")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cashDenomination) throw new ApiError(404, "Cash Denomination count not found");
    if (cashDenomination.status !== CASH_DENOMINATION_STATUS.DRAFT) {
      throw new ApiError(400, `Cannot confirm from status: ${cashDenomination.status}`);
    }

    const adjustVariance = payload?.adjustVariance === true;
    const variance = cashDenomination.variance;

    let adjustmentVoucherId = null;

    if (adjustVariance && variance !== 0) {
      // Get the cash ledger account
      const cashAccount = await CashAccount.findOne({
        _id: cashDenomination.cashAccountId,
      }).session(session);
      if (!cashAccount) throw new ApiError(400, "Linked cash account not found");

      const cashLedgerAccountId = cashAccount.ledgerAccountId;
      const absVariance = Math.abs(variance);
      const isShortage = variance < 0;

      const varianceAccount = await findOrCreateVarianceAccount(
        cashDenomination.workspaceId,
        companyId,
        userId,
        isShortage,
        session,
      );

      const adjNarration =
        `Cash Count #${cashDenomination.countNumber} - ${isShortage ? "Shortage" : "Surplus"} Adjustment ₹${absVariance}`;

      let lines;
      if (isShortage) {
        // Shortage: expense increases, cash decreases
        lines = [
          { accountId: varianceAccount._id, debit: absVariance, credit: 0, narration: adjNarration },
          { accountId: cashLedgerAccountId, debit: 0, credit: absVariance, narration: adjNarration },
        ];
      } else {
        // Surplus: cash increases, income credited
        lines = [
          { accountId: cashLedgerAccountId, debit: absVariance, credit: 0, narration: adjNarration },
          { accountId: varianceAccount._id, debit: 0, credit: absVariance, narration: adjNarration },
        ];
      }

      // Generate voucher number
      const voucherNumber = await voucherNumberService.generateVoucherNumber(
        companyId,
        cashDenomination.workspaceId,
        VOUCHER_TYPE.JOURNAL,
        { session },
      );

      // Create voucher
      const adjustmentVoucher = await journalVoucherRepository.createVoucher(
        {
          workspaceId: cashDenomination.workspaceId,
          companyId,
          voucherNumber,
          voucherDate: new Date(cashDenomination.countDate),
          voucherType: VOUCHER_TYPE.JOURNAL,
          referenceNumber: cashDenomination.countNumber,
          narration: adjNarration,
          totalDebit: absVariance,
          totalCredit: absVariance,
          createdBy: userId,
        },
        { session },
      );

      // Save lines
      const linesWithVoucher = lines.map((l) => ({
        ...l,
        workspaceId: cashDenomination.workspaceId,
        companyId,
        voucherId: adjustmentVoucher._id,
      }));
      await journalLineRepository.createLines(linesWithVoucher, { session });

      // Post the voucher
      await journalPostingService.postJournalVoucher(
        adjustmentVoucher._id,
        companyId,
        cashDenomination.workspaceId,
        userId,
        { session },
      );

      adjustmentVoucherId = adjustmentVoucher._id;
    }

    // Update status
    cashDenomination.status = CASH_DENOMINATION_STATUS.CONFIRMED;
    cashDenomination.confirmedAt = new Date();
    cashDenomination.confirmedBy = userId;
    if (adjustmentVoucherId) {
      cashDenomination.adjustmentJournalVoucherId = adjustmentVoucherId;
    }
    await cashDenomination.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getCashDenominationById(cashDenomination._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 3. CANCEL CASH DENOMINATION (DRAFT → CANCELLED)
//    Only DRAFT records can be cancelled. No journal reversal needed.
// ---------------------------------------------------------------------------
const cancelCashDenomination = async (id, companyId, workspaceId, userId, payload) => {
  const cashDenomination = await mongoose
    .model("CashDenomination")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!cashDenomination) throw new ApiError(404, "Cash Denomination count not found");
  if (cashDenomination.status !== CASH_DENOMINATION_STATUS.DRAFT) {
    throw new ApiError(400, `Only DRAFT counts can be cancelled. Current: ${cashDenomination.status}`);
  }

  cashDenomination.status = CASH_DENOMINATION_STATUS.CANCELLED;
  cashDenomination.cancelledAt = new Date();
  cashDenomination.cancelledBy = userId;
  cashDenomination.cancellationReason = payload?.reason || null;
  await cashDenomination.save();

  return getCashDenominationById(cashDenomination._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// GET CASH DENOMINATIONS (LIST)
// ---------------------------------------------------------------------------
const getCashDenominations = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await cashDenominationRepository.getCashDenominations(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    cashDenominations: result.cashDenominations.map((d) => d.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET CASH DENOMINATION BY ID
// ---------------------------------------------------------------------------
const getCashDenominationById = async (id, companyId, workspaceId) => {
  const cashDenomination =
    await cashDenominationRepository.findCashDenominationByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!cashDenomination) throw new ApiError(404, "Cash Denomination count not found");
  return cashDenomination.toSafeObject();
};

export default {
  createCashDenomination,
  confirmCashDenomination,
  cancelCashDenomination,
  getCashDenominations,
  getCashDenominationById,
};
