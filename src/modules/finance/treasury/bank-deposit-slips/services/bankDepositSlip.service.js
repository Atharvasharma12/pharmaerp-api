import mongoose from "mongoose";
import ApiError from "../../../../../utils/ApiError.js";
import bankDepositSlipRepository from "../repositories/bankDepositSlip.repository.js";
import {
  BANK_DEPOSIT_SLIP_STATUS,
  CASH_IN_TRANSIT_ACCOUNT_CODE,
  CASH_IN_TRANSIT_ACCOUNT_NAME,
  CASH_IN_TRANSIT_GROUP_CODE,
  CASH_IN_TRANSIT_GROUP_NAME,
} from "../constants/bankDepositSlip.constant.js";

import BankAccount from "../../bank-management/bank-accounts/models/bankAccount.model.js";
import branchCashRepository from "../../cash-management/branch-cash/repositories/branchCash.repository.js";
import branchCashService from "../../cash-management/branch-cash/services/branchCash.service.js";
import cashDenominationRepository from "../../cash-management/cash-denominations/repositories/cashDenomination.repository.js";
import { CASH_DENOMINATION_STATUS } from "../../cash-management/cash-denominations/constants/cashDenomination.constant.js";

import journalLineRepository from "../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../journal-vouchers/services/journalPosting.service.js";
import journalCancellationService from "../../../journal-vouchers/services/journalCancellation.service.js";
import { VOUCHER_TYPE } from "../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../journal-vouchers/services/voucherNumber.service.js";
import journalVoucherRepository from "../../../journal-vouchers/repositories/journalVoucher.repository.js";

import findOrCreateSystemAccount from "../../shared/findOrCreateSystemAccount.js";

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the BranchCash for a branch and return it.
 * Bank deposit slips only source from the FROZEN partition.
 */
const resolveBranchCash = async (branchId, companyId, session) => {
  const branchCash = await branchCashRepository.findByBranchId(
    branchId,
    companyId,
    { session }
  );
  if (!branchCash) {
    throw new ApiError(
      400,
      "Branch cash not found. Cannot create deposit slip — branch cash not initialized."
    );
  }
  return branchCash;
};

/**
 * Resolve the active BankAccount document and return it.
 */
const resolveBankAccount = async (bankAccountId, session) => {
  const bankAccount = await BankAccount.findOne({
    _id: bankAccountId,
    isDeleted: false,
    isActive: true,
  }).session(session);
  if (!bankAccount) {
    throw new ApiError(400, "Bank account not found or inactive");
  }
  return bankAccount;
};

/**
 * Retrieve (or auto-create) the Cash-In-Transit suspense system account.
 * This account sits between the cash counter and the bank during the transit period.
 */
const getCashInTransitAccount = async (
  workspaceId,
  companyId,
  userId,
  session,
) => {
  return findOrCreateSystemAccount(
    workspaceId,
    companyId,
    userId,
    CASH_IN_TRANSIT_ACCOUNT_CODE,
    CASH_IN_TRANSIT_ACCOUNT_NAME,
    "ASSET",       // nature: asset account (matches ACCOUNT_NATURE.ASSET / ACCOUNT_GROUP_NATURE.ASSET)
    "CASH",        // category
    CASH_IN_TRANSIT_GROUP_CODE,
    CASH_IN_TRANSIT_GROUP_NAME,
    session,
  );
};

/**
 * Create + post a CONTRA journal voucher.
 * Lines: [{ accountId, debit, credit, narration }]
 */
const createAndPostContraVoucher = async (
  workspaceId,
  companyId,
  userId,
  voucherDate,
  narration,
  referenceNumber,
  lines,
  session,
) => {
  const voucherNumber = await voucherNumberService.generateVoucherNumber(
    companyId,
    workspaceId,
    VOUCHER_TYPE.CONTRA,
    { session },
  );

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const voucher = await journalVoucherRepository.createVoucher(
    {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: new Date(voucherDate),
      voucherType: VOUCHER_TYPE.CONTRA,
      referenceNumber: referenceNumber || null,
      narration,
      totalDebit,
      totalCredit,
      createdBy: userId,
    },
    { session },
  );

  const linesWithVoucher = lines.map((l) => ({
    ...l,
    workspaceId,
    companyId,
    voucherId: voucher._id,
  }));
  await journalLineRepository.createLines(linesWithVoucher, { session });

  await journalPostingService.postJournalVoucher(
    voucher._id,
    companyId,
    workspaceId,
    userId,
    { session },
  );

  return voucher;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE BANK DEPOSIT SLIP  (Status → PREPARED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a bank deposit slip and immediately:
 *   1. Validates denomination sufficiency in the cash account.
 *   2. Deducts denominations from the cash account balance.
 *   3. Creates a CashDenomination snapshot record.
 *   4. Posts Step-1 CONTRA journal: Cash A/c Cr | Cash In Transit A/c Dr
 *   5. Auto-links the open shift (same as FundTransfer).
 *
 * @param {string} workspaceId
 * @param {string} companyId
 * @param {string} userId
 * @param {object} payload
 * @returns {object} Populated BankDepositSlip document
 */
const createBankDepositSlip = async (
  workspaceId,
  companyId,
  userId,
  payload,
) => {
  const {
    slipDate,
    branchId,              // NEW: branch identifies the source (frozen cash)
    toBankAccountId,
    amount,
    denominations,         // required: breakdown of notes in the bag
    depositBagReference,
    bankBranchName,
    narration,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 1. Resolve branch cash (frozen partition) and bank account ─────────
    const branchCash = await resolveBranchCash(branchId, companyId, session);
    await resolveBankAccount(toBankAccountId, session);

    // ── 2. PRE-FLIGHT: validate denomination sufficiency in FROZEN partition ─
    const processedDenominations = (denominations || []).map((d) => ({
      denomination: d.denomination,
      quantity: d.quantity || 0,
      subtotal: d.denomination * (d.quantity || 0),
    }));

    if (processedDenominations.length > 0) {
      await branchCashRepository.validateSufficientFrozenDenominations(
        branchId,
        companyId,
        processedDenominations,
        { session },
      );
    } else {
      // Scalar check: ensure enough frozen cash
      if (branchCash.frozenCash < amount) {
        throw new ApiError(
          400,
          `Insufficient frozen cash. Available: ₹${branchCash.frozenCash}, Requested: ₹${amount}`
        );
      }
    }

    // ── 3. Get / auto-create Cash In Transit system account ────────────────
    const cashInTransitAccount = await getCashInTransitAccount(
      workspaceId,
      companyId,
      userId,
      session,
    );

    // ── 4. Generate slip number ────────────────────────────────────────────
    const slipNumber = await bankDepositSlipRepository.getNextSlipNumber(
      companyId,
      workspaceId,
      { session },
    );

    // ── 5. Create denomination snapshot record ─────────────────────────────
    const physicalTotal = processedDenominations.reduce(
      (sum, d) => sum + d.subtotal,
      0,
    );

    const countNumber = await cashDenominationRepository.getNextCountNumber(
      companyId,
      workspaceId,
      { session },
    );

    const denomRecord = await cashDenominationRepository.createCashDenomination(
      {
        workspaceId,
        companyId,
        branchId,             // NEW: branchId is required; cashAccountId deprecated
        cashAccountId: null,  // deprecated — not set for new slips
        partition: "frozen",  // deposit slips always from frozen
        countNumber,
        countDate: new Date(slipDate),
        denominations: processedDenominations,
        physicalTotal,
        expectedBalance: amount,
        variance: 0,
        narration: narration || `Bank Deposit Slip ${slipNumber} - denomination count`,
        status: CASH_DENOMINATION_STATUS.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: userId,
        createdBy: userId,
      },
      { session },
    );

    // ── 6. Deduct from FROZEN cash partition ───────────────────────────────
    await branchCashService.deductFromFrozen(
      branchId,
      companyId,
      userId,
      amount,
      processedDenominations,
      { session },
    );

    // ── 7. Step-1 Journal: Frozen Cash Ledger Cr → Cash In Transit Dr ──────
    const voucherNarration =
      narration ||
      `Bank Deposit Slip ${slipNumber}: Frozen Cash → Bank (In Transit)`;

    const preparationVoucher = await createAndPostContraVoucher(
      workspaceId,
      companyId,
      userId,
      slipDate,
      voucherNarration,
      slipNumber,
      [
        {
          accountId: cashInTransitAccount._id,
          debit: amount,
          credit: 0,
          narration: voucherNarration,
        },
        {
          // Use BranchCash.ledgerAccountId (the branch-level cash account)
          accountId: branchCash.ledgerAccountId,
          debit: 0,
          credit: amount,
          narration: voucherNarration,
        },
      ],
      session,
    );

    // ── 8. Auto-link open day closing ────────────────────────────────────
    let resolvedDayClosingId = payload.dayClosingId || null;

    if (!resolvedDayClosingId && branchId) {
      try {
        const { DayClosing } = await import(
          "../../../../operations/day-closings/dayClosing.model.js"
        );
        const activeDayClosing = await DayClosing.findOne({
          companyId,
          workspaceId,
          branchId,
          status: { $in: ["draft", "open"] },
        })
          .select("_id")
          .session(session);
        if (activeDayClosing) resolvedDayClosingId = activeDayClosing._id;
      } catch (dcErr) {
        console.warn(
          "[BankDepositSlip] Could not auto-link day closing:",
          dcErr.message,
        );
      }
    }

    // ── 9. Save the BankDepositSlip record ────────────────────────────────
    const slip = await bankDepositSlipRepository.createSlip(
      {
        workspaceId,
        companyId,
        branchId,
        dayClosingId: resolvedDayClosingId,
        slipNumber,
        slipDate: new Date(slipDate),
        fromCashAccountId: null,      // deprecated — not set for new slips
        toBankAccountId,
        amount,
        depositBagReference: depositBagReference || null,
        bankBranchName: bankBranchName || null,
        cashDenominationId: denomRecord._id,
        status: BANK_DEPOSIT_SLIP_STATUS.PREPARED,
        preparationJournalVoucherId: preparationVoucher._id,
        narration: narration || null,
        createdBy: userId,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getBankDepositSlipById(slip._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DEPOSIT  (Status: PREPARED → DEPOSITED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Confirms that the bank has physically received the deposited cash.
 * Posts Step-2 CONTRA journal: Cash In Transit A/c Cr | Bank A/c Dr
 *
 * @param {string} slipId
 * @param {string} companyId
 * @param {string} workspaceId
 * @param {string} userId
 * @param {object} payload  { bankReferenceNumber, depositConfirmedDate }
 */
const confirmDeposit = async (
  slipId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const slip = await mongoose
      .model("BankDepositSlip")
      .findOne({ _id: slipId, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!slip) {
      throw new ApiError(404, "Bank Deposit Slip not found");
    }
    if (slip.status !== BANK_DEPOSIT_SLIP_STATUS.PREPARED) {
      throw new ApiError(
        400,
        `Cannot confirm deposit: slip is in status '${slip.status}'. Only PREPARED slips can be confirmed.`,
      );
    }

    // Resolve bank account ledger ID
    const bankAccount = await resolveBankAccount(slip.toBankAccountId, session);

    // Get Cash In Transit system account
    const cashInTransitAccount = await getCashInTransitAccount(
      workspaceId,
      companyId,
      userId,
      session,
    );

    const confirmedDate = payload.depositConfirmedDate || new Date();
    const narration =
      slip.narration ||
      `Bank Deposit Slip ${slip.slipNumber}: Cash In Transit → Bank (Cleared)`;

    // Step-2 Journal: Cash In Transit A/c Cr → Bank A/c Dr
    const depositVoucher = await createAndPostContraVoucher(
      workspaceId,
      companyId,
      userId,
      confirmedDate,
      narration,
      payload.bankReferenceNumber || slip.slipNumber,
      [
        {
          accountId: bankAccount.ledgerAccountId,
          debit: slip.amount,
          credit: 0,
          narration,
        },
        {
          accountId: cashInTransitAccount.ledgerAccountId || cashInTransitAccount._id,
          debit: 0,
          credit: slip.amount,
          narration,
        },
      ],
      session,
    );

    // Update slip status
    slip.status = BANK_DEPOSIT_SLIP_STATUS.DEPOSITED;
    slip.depositedAt = new Date();
    slip.depositedBy = userId;
    slip.bankReferenceNumber = payload.bankReferenceNumber || null;
    slip.depositConfirmedDate = new Date(confirmedDate);
    slip.depositJournalVoucherId = depositVoucher._id;
    await slip.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getBankDepositSlipById(slip._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL  (Status → CANCELLED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancels a bank deposit slip.
 *
 * Reversal logic (order matters for accounting correctness):
 *   - PREPARED:  cancel preparationJournalVoucherId → return denominations to cash account.
 *   - DEPOSITED: cancel depositJournalVoucherId first, then preparationJournalVoucherId
 *                → return denominations to cash account.
 *
 * @param {string} slipId
 * @param {string} companyId
 * @param {string} workspaceId
 * @param {string} userId
 * @param {object} payload  { reason }
 */
const cancelBankDepositSlip = async (
  slipId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const slip = await mongoose
      .model("BankDepositSlip")
      .findOne({ _id: slipId, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!slip) {
      throw new ApiError(404, "Bank Deposit Slip not found");
    }
    if (slip.status === BANK_DEPOSIT_SLIP_STATUS.CANCELLED) {
      throw new ApiError(400, "Bank Deposit Slip is already cancelled");
    }

    // Cancel Step-2 journal first (if it was deposited)
    if (
      slip.status === BANK_DEPOSIT_SLIP_STATUS.DEPOSITED &&
      slip.depositJournalVoucherId
    ) {
      await journalCancellationService.cancelJournalVoucher(
        slip.depositJournalVoucherId,
        companyId,
        workspaceId,
        userId,
      );
    }

    // Cancel Step-1 journal (both PREPARED and DEPOSITED have this)
    if (slip.preparationJournalVoucherId) {
      await journalCancellationService.cancelJournalVoucher(
        slip.preparationJournalVoucherId,
        companyId,
        workspaceId,
        userId,
      );
    }

    // Return denominations to the source cash account balance
    if (slip.cashDenominationId) {
      const denomDoc = await mongoose
        .model("CashDenomination")
        .findById(slip.cashDenominationId)
        .session(session);

      if (denomDoc && denomDoc.denominations && denomDoc.denominations.length > 0) {
        // Return denominations to the branch cash frozen partition.
        // addFrozenDenominations recomputes frozenTotal from denomination sums — no scalar increment needed.
        const branchCashRepository = (await import("../../cash-management/branch-cash/repositories/branchCash.repository.js")).default;
        await branchCashRepository.addFrozenDenominations(
          slip.branchId,
          slip.companyId,
          denomDoc.denominations,
          userId,
          { session },
        );
      }
    }

    // Update slip
    slip.status = BANK_DEPOSIT_SLIP_STATUS.CANCELLED;
    slip.cancelledAt = new Date();
    slip.cancelledBy = userId;
    slip.cancellationReason = payload?.reason || null;
    await slip.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getBankDepositSlipById(slip._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

const getBankDepositSlips = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await bankDepositSlipRepository.getSlips(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    bankDepositSlips: result.slips.map((s) => s.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getBankDepositSlipById = async (id, companyId, workspaceId) => {
  const slip =
    await bankDepositSlipRepository.findSlipByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!slip) {
    throw new ApiError(404, "Bank Deposit Slip not found");
  }
  return slip.toSafeObject();
};

// ─────────────────────────────────────────────────────────────────────────────

export default {
  createBankDepositSlip,
  confirmDeposit,
  cancelBankDepositSlip,
  getBankDepositSlips,
  getBankDepositSlipById,
};
