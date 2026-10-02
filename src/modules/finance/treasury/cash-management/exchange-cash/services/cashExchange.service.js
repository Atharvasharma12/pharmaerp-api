import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashExchangeRepository from "../repositories/cashExchange.repository.js";
import { CASH_EXCHANGE_STATUS } from "../constants/cashExchange.constant.js";
import CashAccount from "../../cash-accounts/models/cashAccount.model.js";
import cashDenominationBalanceRepository from "../../cash-denomination-balances/repositories/cashDenominationBalance.repository.js";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Compute the monetary total from a denomination array.
 * Uses integer rounding to avoid floating-point drift.
 */
const computeTotal = (denominations) =>
  denominations.reduce((sum, d) => sum + d.denomination * d.quantity, 0);

/**
 * Normalize a denomination array — compute subtotal per line.
 */
const normalizeDenominations = (denominations) =>
  denominations.map((d) => ({
    denomination: d.denomination,
    quantity: d.quantity,
    subtotal: d.denomination * d.quantity,
  }));

// ---------------------------------------------------------------------------
// CREATE CASH EXCHANGE
// ---------------------------------------------------------------------------
const createCashExchange = async (workspaceId, companyId, userId, payload) => {
  const {
    exchangeDate,
    cashAccountId,
    denominationsReceived,
    denominationsGiven,
    narration,
    notes,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Normalise incoming denominations (compute subtotals)
    const normReceived = normalizeDenominations(denominationsReceived);
    const normGiven = normalizeDenominations(denominationsGiven);

    const totalReceived = computeTotal(normReceived);
    const totalGiven = computeTotal(normGiven);

    // 2. Service-layer balance invariant (defence-in-depth beyond Joi)
    if (Math.round(totalReceived * 100) !== Math.round(totalGiven * 100)) {
      throw new ApiError(
        400,
        `Exchange imbalance: total received (₹${totalReceived}) does not equal total given (₹${totalGiven})`,
      );
    }

    // 3. Validate cash account exists and is active
    const cashAccount = await CashAccount.findOne({
      _id: cashAccountId,
      workspaceId,
      companyId,
      isDeleted: false,
      status: "active",
    }).session(session);

    if (!cashAccount) {
      throw new ApiError(400, "Cash account not found or inactive");
    }

    // 4. PRE-FLIGHT: validate sufficient denominations for what we give OUT
    //    (we must have the change in the drawer before we hand it over)
    await cashDenominationBalanceRepository.validateSufficientDenominations(
      cashAccountId,
      normGiven,
      { session },
    );

    // 5. Generate sequential exchange number: EX-YYYY-NNNNN
    const exchangeNumber = await cashExchangeRepository.getNextExchangeNumber(
      companyId,
      workspaceId,
      { session },
    );

    // 6. Resolve branchId from cash account
    const branchId = cashAccount.branchId || null;

    // 7. Auto-detect open shift for this branch
    let shiftId = null;
    if (branchId) {
      try {
        const { Shift } = await import(
          "../../../../../operations/shifts/shift.model.js"
        );
        const openShift = await Shift.findOne({
          companyId,
          workspaceId,
          branchId,
          status: "open",
        })
          .select("_id")
          .session(session);
        if (openShift) shiftId = openShift._id;
      } catch (shiftErr) {
        // Non-fatal: exchange saves without shiftId if lookup fails
        console.warn(
          "[CashExchange] Could not auto-link shift:",
          shiftErr.message,
        );
      }
    }

    // 8. Update denomination balance:
    //    SUBTRACT the denominations we are GIVING to the customer
    await cashDenominationBalanceRepository.subtractDenominations(
      cashAccountId,
      normGiven,
      userId,
      { session },
    );

    //    ADD the denominations we are RECEIVING from the customer
    await cashDenominationBalanceRepository.addDenominations(
      cashAccountId,
      normReceived,
      userId,
      { session },
    );

    // 9. Persist the CashExchange record
    const cashExchange = await cashExchangeRepository.createCashExchange(
      {
        workspaceId,
        companyId,
        branchId,
        shiftId,
        exchangeNumber,
        exchangeDate: new Date(exchangeDate),
        cashAccountId,
        denominationsReceived: normReceived,
        totalReceived,
        denominationsGiven: normGiven,
        totalGiven,
        narration: narration || null,
        notes: notes || null,
        status: CASH_EXCHANGE_STATUS.COMPLETED,
        createdBy: userId,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Return fully populated document
    return getCashExchangeById(cashExchange._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// GET CASH EXCHANGES (LIST)
// ---------------------------------------------------------------------------
const getCashExchanges = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;

  const result = await cashExchangeRepository.getCashExchanges(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    cashExchanges: result.cashExchanges.map((ce) => ce.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET CASH EXCHANGE BY ID
// ---------------------------------------------------------------------------
const getCashExchangeById = async (id, companyId, workspaceId) => {
  const cashExchange = await cashExchangeRepository.findByIdCompanyAndWorkspace(
    id,
    companyId,
    workspaceId,
  );
  if (!cashExchange) {
    throw new ApiError(404, "Cash Exchange not found");
  }
  return cashExchange.toSafeObject();
};

// ---------------------------------------------------------------------------
// CANCEL CASH EXCHANGE
// ---------------------------------------------------------------------------
const cancelCashExchange = async (
  id,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cashExchange = await mongoose
      .model("CashExchange")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cashExchange) {
      throw new ApiError(404, "Cash Exchange not found");
    }

    if (cashExchange.status === CASH_EXCHANGE_STATUS.CANCELLED) {
      throw new ApiError(400, "Cash Exchange is already cancelled");
    }

    // PRE-FLIGHT: validate we have enough of what was originally received
    // (on cancellation the "given" side is reversed — we must have the change back)
    await cashDenominationBalanceRepository.validateSufficientDenominations(
      cashExchange.cashAccountId,
      cashExchange.denominationsReceived,
      { session },
    );

    // Reverse the denomination changes:
    //   SUBTRACT denominations we RECEIVED (they go back to customer)
    await cashDenominationBalanceRepository.subtractDenominations(
      cashExchange.cashAccountId,
      cashExchange.denominationsReceived,
      userId,
      { session },
    );

    //   ADD denominations we GAVE (they come back to us)
    await cashDenominationBalanceRepository.addDenominations(
      cashExchange.cashAccountId,
      cashExchange.denominationsGiven,
      userId,
      { session },
    );

    cashExchange.status = CASH_EXCHANGE_STATUS.CANCELLED;
    cashExchange.cancelledAt = new Date();
    cashExchange.cancelledBy = userId;
    cashExchange.cancellationReason = payload?.reason || null;
    await cashExchange.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getCashExchangeById(cashExchange._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  createCashExchange,
  getCashExchanges,
  getCashExchangeById,
  cancelCashExchange,
};
