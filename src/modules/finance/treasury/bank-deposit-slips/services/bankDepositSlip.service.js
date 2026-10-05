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

    // ── 8. Auto-link open Business Day (required) ─────────────────────────
    let resolvedBusinessDayId = payload.businessDayId || null;

    if (!resolvedBusinessDayId && branchId) {
      try {
        const { BusinessDay } = await import(
          "../../../../operations/business-days/businessDay.model.js"
        );
        const activeBusinessDay = await BusinessDay.findOne({
          companyId,
          workspaceId,
          branchId,
          status: "open",
        })
          .select("_id")
          .session(session);
        if (activeBusinessDay) {
          resolvedBusinessDayId = activeBusinessDay._id;
        } else {
          throw new ApiError(
            400,
            "A Bank Deposit Slip can only be created during an open Business Day. " +
            "Please open a Business Day for this branch first."
          );
        }
      } catch (bdErr) {
        if (bdErr instanceof ApiError) throw bdErr;
        console.warn(
          "[BankDepositSlip] Could not auto-link business day:",
          bdErr.message,
        );
      }
    }

    // ── 9. Save the BankDepositSlip record ────────────────────────────────
    const slip = await bankDepositSlipRepository.createSlip(
      {
        workspaceId,
        companyId,
        branchId,
        businessDayId: resolvedBusinessDayId,
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

    // Return REMAINING denominations to the source cash account balance.
    // remainingAmount = slip.amount - SUM(withdrawals[].amount)
    // Partial withdrawals already exited the system via their own journal entries;
    // only the remaining (unreturned) cash is returned to frozen.
    const totalWithdrawn = (slip.withdrawals || []).reduce(
      (s, w) => s + (Number(w.amount) || 0), 0,
    );
    const remainingAmount = slip.amount - totalWithdrawn;

    if (slip.cashDenominationId && remainingAmount > 0) {
      const denomDoc = await mongoose
        .model("CashDenomination")
        .findById(slip.cashDenominationId)
        .session(session);

      if (denomDoc && denomDoc.denominations && denomDoc.denominations.length > 0) {
        // Compute which denominations to return based on withdrawal sub-totals
        // If no partial withdrawals occurred, return everything.
        let denominationsToReturn = denomDoc.denominations;

        if (totalWithdrawn > 0) {
          // Aggregate withdrawn denominations to subtract from total
          const withdrawnDenomMap = new Map();
          for (const w of (slip.withdrawals || [])) {
            for (const d of (w.denominations || [])) {
              const key = Number(d.denomination);
              withdrawnDenomMap.set(key, (withdrawnDenomMap.get(key) || 0) + Number(d.quantity));
            }
          }
          // Subtract withdrawn from original denominations
          denominationsToReturn = denomDoc.denominations
            .map((d) => {
              const withdrawn = withdrawnDenomMap.get(Number(d.denomination)) || 0;
              const returnQty = Math.max(0, Number(d.quantity) - withdrawn);
              return { denomination: Number(d.denomination), quantity: returnQty };
            })
            .filter((d) => d.quantity > 0);
        }

        if (denominationsToReturn.length > 0) {
          const branchCashRepo = (await import("../../cash-management/branch-cash/repositories/branchCash.repository.js")).default;
          await branchCashRepo.addFrozenDenominations(
            slip.branchId,
            slip.companyId,
            denominationsToReturn,
            userId,
            { session },
          );
        }
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

// PARTIAL WITHDRAW FROM BANK DEPOSIT SLIP

/**
 * Withdraw partial cash from a PREPARED BDS before deposit.
 *
 * Rules:
 *   - Slip must be PREPARED.
 *   - Withdrawal amount must not exceed remainingAmount.
 *   - Denominations required (no scalar-only).
 *   - Journal: Dr Cash-Payments / Cr Cash-In-Transit
 *   - Entry appended to slip.withdrawals[].
 */
const withdrawFromBankDepositSlip = async (workspaceId, companyId, userId, payload) => {
  const { slipId, amount, denominations = [], narration } = payload;

  if (!denominations || denominations.length === 0) {
    throw new ApiError(400, "Denomination breakdown is required for BDS withdrawal.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const slip = await mongoose
      .model("BankDepositSlip")
      .findOne({ _id: slipId, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!slip) throw new ApiError(404, "Bank Deposit Slip not found");
    if (slip.status !== BANK_DEPOSIT_SLIP_STATUS.PREPARED) {
      throw new ApiError(
        400,
        `Cannot withdraw from slip in status '${slip.status}'. Only PREPARED slips allow withdrawals.`,
      );
    }

    // Validate denomination sum
    const processedDenoms = denominations.map((d) => ({
      denomination: Number(d.denomination),
      quantity:     Number(d.quantity) || 0,
      subtotal:     Number(d.denomination) * (Number(d.quantity) || 0),
    }));
    const denomSum = processedDenoms.reduce((s, d) => s + d.subtotal, 0);
    if (Math.abs(denomSum - amount) > 0.01) {
      throw new ApiError(
        400,
        `Denomination sum (Rs.${denomSum}) does not match declared withdrawal (Rs.${amount}).`,
      );
    }

    // Validate against remaining amount
    const alreadyWithdrawn = (slip.withdrawals || []).reduce(
      (s, w) => s + (Number(w.amount) || 0), 0,
    );
    const remainingAmount = slip.amount - alreadyWithdrawn;
    if (amount > remainingAmount + 0.01) {
      throw new ApiError(
        400,
        `Cannot withdraw Rs.${amount}: only Rs.${remainingAmount.toFixed(2)} remains in this slip.`,
      );
    }

    // Journal: Dr Cash-Payments / Cr Cash-In-Transit
    const cashInTransitAccount = await getCashInTransitAccount(workspaceId, companyId, userId, session);
    const cashPaymentsAccount  = await findOrCreateSystemAccount(
      workspaceId, companyId, userId,
      "SYS-CASH-PAYMENTS", "Cash Payments", "EXPENSE", "EXPENSE",
      "SYS-MISC-EXPENSE", "Miscellaneous Expenses", session,
    );

    const wdNarration = narration || `Partial withdrawal from BDS ${slip.slipNumber}`;
    const withdrawalVoucher = await createAndPostContraVoucher(
      workspaceId, companyId, userId, new Date(), wdNarration, slip.slipNumber,
      [
        { accountId: cashPaymentsAccount._id, debit: amount,  credit: 0,      narration: wdNarration },
        { accountId: cashInTransitAccount._id, debit: 0,      credit: amount,  narration: wdNarration },
      ],
      session,
    );

    // Append to slip.withdrawals[]
    slip.withdrawals = slip.withdrawals || [];
    slip.withdrawals.push({
      amount,
      denominations: processedDenoms,
      journalVoucherId: withdrawalVoucher._id,
      withdrawnBy: userId,
      withdrawnAt: new Date(),
      narration: narration || null,
    });
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

// CASH IN TRANSIT (company-scope read)

/**
 * Returns all PREPARED BDS across the company (or filtered by branchId).
 * Each slip has remainingAmount = amount - SUM(withdrawals[].amount) computed.
 * Used by the read-only CIT page (no branch restriction by default).
 */
const getCashInTransit = async (workspaceId, companyId, query = {}) => {
  const { page = 1, limit = 50, branchId } = query;

  const filters = { status: BANK_DEPOSIT_SLIP_STATUS.PREPARED };
  if (branchId) filters.branchId = branchId;

  const result = await bankDepositSlipRepository.getSlips(
    workspaceId, companyId, filters,
    { page, limit, sort: "-slipDate", all: false },
  );

  const slips = result.slips.map((s) => {
    const obj = s.toSafeObject();
    const totalWithdrawn = (s.withdrawals || []).reduce(
      (acc, w) => acc + (Number(w.amount) || 0), 0,
    );
    obj.remainingAmount = s.amount - totalWithdrawn;
    obj.totalWithdrawn  = totalWithdrawn;
    return obj;
  });

  const totalCIT = slips.reduce((sum, s) => sum + s.remainingAmount, 0);

  return {
    cashInTransit: slips,
    totalCIT,
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export default {
  createBankDepositSlip,
  confirmDeposit,
  cancelBankDepositSlip,
  withdrawFromBankDepositSlip,
  getCashInTransit,
  getBankDepositSlips,
  getBankDepositSlipById,
};
