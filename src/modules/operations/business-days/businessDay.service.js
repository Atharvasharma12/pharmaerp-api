import { BusinessDay } from "./businessDay.model.js";
import { Shift } from "../shifts/shift.model.js";
import ApiError from "../../../utils/ApiError.js";

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Normalise any date value to midnight UTC (canonical business date).
 * Accepts YYYY-MM-DD string, Date object, or timestamp.
 * Avoids timezone drift by parsing YYYY-MM-DD components directly into UTC.
 */
const toCanonicalDate = (input) => {
  if (!input) {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  if (typeof input === "string") {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(Date.UTC(year, month, day));
    }
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Returns today's canonical date (midnight UTC).
 * If clientDate (e.g. "2026-10-08") is provided, normalizes that date.
 */
const todayCanonical = (clientDate) => {
  if (clientDate) {
    return toCanonicalDate(clientDate);
  }
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/**
 * Returns tomorrow's canonical date (midnight UTC).
 */
const tomorrowCanonical = (clientDate) => {
  const base = todayCanonical(clientDate);
  const t = new Date(base.getTime());
  t.setUTCDate(t.getUTCDate() + 1);
  return t;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the currently OPEN BusinessDay for a branch, or null.
 * Used as a shared guard across Shift and BankDepositSlip services.
 */
export const getOpenBusinessDay = async (branchId) => {
  return BusinessDay.findOne({ branchId, status: "open" });
};

/**
 * Returns the suggested businessDate for the next Business Day opening.
 *
 * Logic:
 *   - If no BusinessDay exists for today → suggest today.
 *   - If today's BusinessDay is already closed → suggest tomorrow.
 *   - If a BusinessDay is already open → no suggestion (caller handles this).
 *
 * @returns {{ suggestedDate: Date, reason: string }}
 */
export const getSuggestedBusinessDate = async (branchId, clientDate) => {
  const today = todayCanonical(clientDate);
  const tomorrow = tomorrowCanonical(clientDate);

  const openDay = await BusinessDay.findOne({ branchId, status: "open" }).lean();
  if (openDay) {
    return {
      suggestedDate: null,
      reason: "A Business Day is already open. Close it before opening a new one.",
      hasOpenDay: true,
      openDayId: openDay._id,
      openDayBusinessDate: openDay.businessDate,
      todayDate: today,
      tomorrowDate: tomorrow,
    };
  }

  const todayDay = await BusinessDay.findOne({
    branchId,
    businessDate: today,
    status: { $ne: "cancelled" },
  }).lean();

  if (!todayDay || todayDay.status === "open") {
    return {
      suggestedDate: today,
      reason: "Ready to start today's business day operations.",
      hasOpenDay: false,
      todayDate: today,
      tomorrowDate: tomorrow,
      isTodayClosed: false,
    };
  }

  // Today is already closed → suggest tomorrow
  return {
    suggestedDate: tomorrow,
    reason: "Today is already closed. Opening for tomorrow.",
    hasOpenDay: false,
    todayDate: today,
    tomorrowDate: tomorrow,
    isTodayClosed: true,
  };
};

/**
 * Opens a new Business Day for a branch.
 *
 * Rules enforced:
 *   1. No other BusinessDay can be OPEN for this branch.
 *   2. businessDate must be today or tomorrow only (past dates and dates beyond tomorrow strictly disallowed).
 *
 * @param {object} data
 * @param {string} data.workspaceId
 * @param {string} data.companyId
 * @param {string} data.branchId
 * @param {Date}   data.businessDate  - The logical date (validated: today or tomorrow)
 * @param {string} [data.clientDate]  - Local calendar date string from client
 * @param {string} data.createdBy
 * @param {string} [data.note]
 */
export const openBusinessDay = async (data) => {
  const { workspaceId, companyId, branchId, businessDate, clientDate, createdBy, note } = data;

  // Guard 1: Only one open Business Day per branch
  const existingOpen = await BusinessDay.findOne({ branchId, status: "open" });
  if (existingOpen) {
    throw new ApiError(
      400,
      `A Business Day is already open for this branch (${existingOpen.businessDayNo}). ` +
      `Please close it before opening a new one.`
    );
  }

  // Guard 2: Enforce strict sequential date logic (only Today or Tomorrow)
  const suggestion = await getSuggestedBusinessDate(branchId, clientDate);
  
  if (suggestion.hasOpenDay) {
    throw new ApiError(400, suggestion.reason);
  }

  const canonical = toCanonicalDate(businessDate);
  const today = todayCanonical(clientDate);
  const tomorrow = tomorrowCanonical(clientDate);

  if (canonical.getTime() < today.getTime()) {
    throw new ApiError(
      400,
      `Cannot open a Business Day for past dates or yesterday. You can only open for today or tomorrow.`
    );
  }

  if (canonical.getTime() > tomorrow.getTime()) {
    throw new ApiError(
      400,
      `Cannot open a Business Day beyond tomorrow. You can only open for today or tomorrow.`
    );
  }

  const existingForDate = await BusinessDay.findOne({
    branchId,
    businessDate: canonical,
    status: { $ne: "cancelled" },
  });

  if (existingForDate) {
    throw new ApiError(
      400,
      `A Business Day for this date (${canonical.toISOString().split("T")[0]}) already exists with status: ${existingForDate.status}.`
    );
  }

  const businessDayNo = `BD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

  const businessDay = await BusinessDay.create({
    workspaceId,
    companyId,
    branchId,
    businessDate: canonical,
    actualOpenedAt: new Date(),
    businessDayNo,
    status: "open",
    createdBy,
    note: note || "",
  });

  return businessDay;
};

/**
 * Closes a Business Day.
 *
 * On close:
 *   - Verifies no linked Shift is still 'open'.
 *   - Aggregates all financial data from linked Shifts.
 *   - Stores per-shift cash breakdown in cashByShift[].
 *   - Sets status: 'closed' and records actualClosedAt.
 *
 * @param {string} businessDayId
 * @param {string} userId
 * @param {object} payload
 * @param {number} [payload.actualClosingCashAmount]
 * @param {Array}  [payload.closingDenominations]
 * @param {string} [payload.note]
 */
export const closeBusinessDay = async (businessDayId, userId, payload = {}) => {
  const { actualClosingCashAmount, closingDenominations = [], note } = payload;

  const businessDay = await BusinessDay.findById(businessDayId);
  if (!businessDay) throw new ApiError(404, "Business Day not found");
  if (businessDay.status === "closed") throw new ApiError(400, "Business Day is already closed");
  if (businessDay.status === "cancelled") throw new ApiError(400, "Cancelled Business Day cannot be closed");

  // Guard: All linked shifts must be closed
  const openShifts = await Shift.find({
    businessDayId: businessDay._id,
    status: "open",
  });
  if (openShifts.length > 0) {
    throw new ApiError(
      400,
      `Cannot close the Business Day. ${openShifts.length} shift(s) are still open. ` +
      `Please close all shifts first.`
    );
  }

  // Fetch all shifts that belong to this Business Day
  const shifts = await Shift.find({
    businessDayId: businessDay._id,
    status: { $ne: "cancelled" },
  }).sort({ openedAt: 1 });

  // ── Aggregate financial data from all shifts ──────────────────────────────
  let openingTotal = 0;
  let openingDenominations = [];
  let expectedTotal = 0;
  let closingDenominationsFromShifts = [];
  let totalFundWithdrawals = 0;
  let totalFundDeposits = 0;
  let totalManualDeposits = 0;
  let totalManualWithdrawals = 0;
  const cashByShift = [];

  if (shifts.length > 0) {
    const firstShift = shifts[0];
    const lastShift = shifts[shifts.length - 1];

    openingTotal = firstShift.openingFloatAmount || 0;
    openingDenominations = firstShift.openingDenominations || [];
    expectedTotal = lastShift.expectedClosingCashAmount || 0;
    closingDenominationsFromShifts = lastShift.closingDenominations || [];

    totalFundWithdrawals = shifts.reduce((sum, s) => sum + (s.totalFundWithdrawals || 0), 0);
    totalFundDeposits = shifts.reduce((sum, s) => sum + (s.totalFundDeposits || 0), 0);

    for (const s of shifts) {
      const shiftDeposits = (s.manualDeposits || []).reduce((acc, d) => acc + (d.amount || 0), 0);
      const shiftWithdrawals = (s.manualWithdrawals || [])
        .filter((w) => w.source === "running")
        .reduce((acc, w) => acc + (w.amount || 0), 0);

      totalManualDeposits += shiftDeposits;
      totalManualWithdrawals += shiftWithdrawals;

      cashByShift.push({
        shiftId:      s._id,
        shiftName:    s.shiftName || "",
        shiftNo:      s.shiftNo || "",
        openingFloat: s.openingFloatAmount || 0,
        cashSales:    s.cashSalesTotal || 0,
        deposits:     shiftDeposits,
        withdrawals:  shiftWithdrawals,
        expectedCash: s.expectedClosingCashAmount || 0,
        actualCash:   s.actualClosingCashAmount || 0,
      });
    }
  }

  // Use provided actualClosingCashAmount if given, else use last shift's amount
  const finalActualCash =
    actualClosingCashAmount !== undefined && actualClosingCashAmount !== null
      ? Number(actualClosingCashAmount)
      : (shifts[shifts.length - 1]?.actualClosingCashAmount || 0);

  const finalClosingDenominations =
    closingDenominations.length > 0 ? closingDenominations : closingDenominationsFromShifts;

  // ── Write all aggregated data to Business Day ─────────────────────────────
  businessDay.status = "closed";
  businessDay.actualClosedAt = new Date();
  businessDay.closedBy = userId;

  businessDay.openingFloatAmount = openingTotal;
  businessDay.openingDenominations = openingDenominations;
  businessDay.expectedClosingCashAmount = expectedTotal;
  businessDay.actualClosingCashAmount = finalActualCash;
  businessDay.closingDenominations = finalClosingDenominations;
  businessDay.cashDifferenceAmount = finalActualCash - expectedTotal;
  businessDay.totalFundWithdrawals = totalFundWithdrawals;
  businessDay.totalFundDeposits = totalFundDeposits;
  businessDay.totalManualDeposits = totalManualDeposits;
  businessDay.totalManualWithdrawals = totalManualWithdrawals;
  businessDay.cashByShift = cashByShift;

  if (note) businessDay.note = note;

  await businessDay.save();
  return businessDay;
};

/**
 * Cancels a Business Day.
 * Only allowed if status is 'open' (not 'closed').
 */
export const cancelBusinessDay = async (businessDayId, userId, note) => {
  const businessDay = await BusinessDay.findById(businessDayId);
  if (!businessDay) throw new ApiError(404, "Business Day not found");
  if (businessDay.status === "closed") {
    throw new ApiError(400, "A closed Business Day cannot be cancelled");
  }

  businessDay.status = "cancelled";
  businessDay.actualClosedAt = new Date();
  businessDay.closedBy = userId;
  if (note) businessDay.note = note;

  await businessDay.save();
  return businessDay;
};
