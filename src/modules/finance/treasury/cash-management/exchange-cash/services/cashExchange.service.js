import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashExchangeRepository from "../repositories/cashExchange.repository.js";
import { CASH_EXCHANGE_STATUS } from "../constants/cashExchange.constant.js";
import BranchCash from "../../branch-cash/models/branchCash.model.js";
import branchCashRepository from "../../branch-cash/repositories/branchCash.repository.js";

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
    branchId,
    cashPartition = "running",
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

    // 3. Validate BranchCash exists and is active
    const branchCash = await BranchCash.findOne({
      branchId,
      workspaceId,
      companyId,
      isActive: true,
    }).session(session);

    if (!branchCash) {
      throw new ApiError(400, "Branch Cash not found or inactive");
    }

    // 4. PRE-FLIGHT: validate sufficient denominations for what we give OUT
    if (cashPartition === "running") {
      await branchCashRepository.validateSufficientRunningDenominations(
        branchId,
        companyId,
        normGiven,
        { session },
      );
    } else {
      await branchCashRepository.validateSufficientFrozenDenominations(
        branchId,
        companyId,
        normGiven,
        { session },
      );
    }

    // 5. Generate sequential exchange number: EX-YYYY-NNNNN
    const exchangeNumber = await cashExchangeRepository.getNextExchangeNumber(
      companyId,
      workspaceId,
      { session },
    );



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
    if (cashPartition === "running") {
      await branchCashRepository.subtractRunningDenominations(
        branchId,
        companyId,
        normGiven,
        userId,
        { session },
      );
      await branchCashRepository.addRunningDenominations(
        branchId,
        companyId,
        normReceived,
        userId,
        { session },
      );
    } else {
      await branchCashRepository.subtractFrozenDenominations(
        branchId,
        companyId,
        normGiven,
        userId,
        { session },
      );
      await branchCashRepository.addFrozenDenominations(
        branchId,
        companyId,
        normReceived,
        userId,
        { session },
      );
    }

    // 9. Persist the CashExchange record
    const cashExchange = await cashExchangeRepository.createCashExchange(
      {
        workspaceId,
        companyId,
        branchId,
        shiftId,
        exchangeNumber,
        exchangeDate: new Date(exchangeDate),
        cashPartition,
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



export default {
  createCashExchange,
  getCashExchanges,
  getCashExchangeById,
};
