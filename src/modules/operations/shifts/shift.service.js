import { Shift } from "./shift.model.js";
import { DayClosing } from "../day-closings/dayClosing.model.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import branchCashService from "../../finance/treasury/cash-management/branch-cash/services/branchCash.service.js";
import ApiError from "../../../utils/ApiError.js";
import { getTimePeriod, periodIdToLabel } from "../../../utils/timePeriod.js";
import { getBusinessDateRange } from "../../../utils/businessDate.js";

import branchCashRepository from "../../finance/treasury/cash-management/branch-cash/repositories/branchCash.repository.js";

export const openShift = async (data) => {
  const { workspaceId, companyId, branchId, date } = data;

  // Ensure no open day closing for this date
  const { dateFilter } = getBusinessDateRange(date);
  const dayClosing = await DayClosing.findOne({ branchId, date: dateFilter, status: { $ne: "cancelled" } });
  if (dayClosing) {
    throw new ApiError(400, "A day closing process already exists for this date.");
  }

  // Ensure no currently open shift for this branch
  const openShift = await Shift.findOne({ branchId, status: "open" });
  if (openShift) {
    throw new ApiError(400, "An open shift already exists for this branch. Please close it first.");
  }

  // Guard: BranchCash must be initialized before a shift can be opened.
  // This prevents phantom shifts on uninitialized branches.
  if (branchId) {
    const existingBranchCash = await branchCashRepository.findByBranchId(branchId, companyId);
    if (!existingBranchCash) {
      throw new ApiError(
        400,
        "Branch cash is not initialized for this branch. " +
        "Please go to Finance \u2192 Treasury \u2192 Branch Cash and set up the opening balance before opening a shift."
      );
    }
  }

  // Resolve opening denominations and ensure openingFloatAmount is exact denomination sum
  let openingDenominations = data.openingDenominations || [];
  let openingFloatAmount = Number(data.openingFloatAmount) || 0;

  if (openingDenominations.length > 0) {
    openingFloatAmount = openingDenominations.reduce(
      (sum, d) => sum + (Number(d.denomination) || 0) * (Number(d.count || d.quantity) || 0),
      0
    );
  } else if (branchId) {
    try {
      const branchBalance = await branchCashRepository.findBalanceByBranchId(branchId, companyId);
      if (branchBalance?.runningDenominations?.length > 0) {
        openingDenominations = branchBalance.runningDenominations.map((d) => ({
          denomination: d.denomination,
          count: d.quantity,
          amount: d.subtotal || (d.denomination * d.quantity),
        }));
        openingFloatAmount = openingDenominations.reduce((sum, d) => sum + (d.amount || 0), 0);
      }
    } catch (e) {
      console.warn("[Shift] Could not fetch runningDenominations for openShift:", e.message);
    }
  }

  const shift = await Shift.create({
    ...data,
    openingFloatAmount,
    openingDenominations,
  });

  return shift;
};

/**
 * Close a shift.
 *
 * New behaviour:
 *   1. Calculate totalCash = openingFloat + cashSalesThisShift
 *   2. carryForwardAmount = how much the pharmacist wants in running for next shift
 *   3. frozenAtClose = totalCash - carryForwardAmount → moves to frozen reserve
 *   4. BranchCash is updated atomically via branchCashService.freezeAtShiftClose
 *
 * @param {string} shiftId
 * @param {string} userId
 * @param {number} actualClosingCashAmount   - physical cash counted at close
 * @param {Array}  closingDenominations      - denomination breakdown of physical cash
 * @param {string} note
 * @param {number} carryForwardAmount        - how much to keep as running (rest becomes frozen)
 * @param {Array}  frozenDenominations       - denomination breakdown of frozen portion
 */
export const closeShift = async (
  shiftId,
  userId,
  actualClosingCashAmount,
  closingDenominations = [],
  note,
  carryForwardAmount = 0,
  frozenDenominations = []
) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.status !== "open") throw new ApiError(400, "Shift is not open");

  // Validate carryForwardAmount
  const safeCarry = Math.max(0, Number(carryForwardAmount) || 0);
  const totalCash = Math.max(0, Number(actualClosingCashAmount) || 0);

  if (safeCarry > totalCash) {
    throw new ApiError(
      400,
      `Carry-forward amount (₹${safeCarry}) cannot exceed actual closing cash (₹${totalCash})`
    );
  }

  const frozenAmount = totalCash - safeCarry;

  // ── Calculate expected cash dynamically ──────────────────────────────────
  const query = {
    workspaceId: shift.workspaceId,
    companyId: shift.companyId,
    createdAt: { $gte: shift.openedAt || shift.createdAt, $lte: new Date() },
    isDeleted: false,
  };

  if (shift.branchId) query.branchId = shift.branchId;

  const invoices = await SalesInvoice.find(query);

  const totalCashSales = invoices.reduce((sum, inv) => {
    if (inv.paymentMethod === "Split" && Array.isArray(inv.payments)) {
      const cashPayments = inv.payments.filter((p) => {
        const pt = p.paymentType ? p.paymentType.toUpperCase() : "CASH";
        return (
          pt.includes("CASH") ||
          (!pt.includes("UPI") &&
            !pt.includes("QR") &&
            !pt.includes("CARD") &&
            !pt.includes("WALLET") &&
            !pt.includes("CREDIT"))
        );
      });
      return sum + cashPayments.reduce((s, p) => s + (p.amount || 0), 0);
    } else {
      const pMethod = inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "CASH";
      if (pMethod.includes("UPI") || pMethod.includes("QR")) {
        return sum;
      }
      const cashCollected =
        inv.cashTendered - inv.changeDue > 0
          ? inv.cashTendered - inv.changeDue
          : inv.grandTotal || 0;
      return sum + cashCollected;
    }
  }, 0);

  // Compute manual deposit / withdrawal totals already recorded on the shift
  // (these are populated by branchCash.service when deposit/withdraw APIs are called
  //  during the open shift — we now include them in the expected-cash formula)
  const totalManualDeposits = (shift.manualDeposits || []).reduce((s, d) => s + (d.amount || 0), 0);
  const totalManualWithdrawalsFromRunning = (shift.manualWithdrawals || [])
    .filter((w) => w.source === "running")
    .reduce((s, w) => s + (w.amount || 0), 0);

  // Expected = Opening + Cash Sales + Deposits into Running − Withdrawals from Running
  const expectedCash = shift.openingFloatAmount + totalCashSales + totalManualDeposits - totalManualWithdrawalsFromRunning;

  // ── Freeze excess cash into frozen reserve ───────────────────────────────
  if (frozenAmount > 0 && shift.branchId) {
    try {
      await branchCashService.freezeAtShiftClose(
        shift.branchId.toString(),
        shift.companyId.toString(),
        userId,
        frozenAmount,
        frozenDenominations,
        closingDenominations  // full counted denominations for carry-forward calculation
      );
      // Log freeze event to frozenLedger for day-closing timeline
      await branchCashService.pushFreezeAuditEntry(
        shift.branchId.toString(),
        shift.companyId.toString(),
        { frozenAmount, shiftId: shift._id, userId },
      );
    } catch (freezeErr) {
      console.warn("[Shift] freezeAtShiftClose warning:", freezeErr.message);
      // Non-fatal if BranchCash hasn't been initialised yet (legacy data)
    }
  }

  // ── Update shift record ──────────────────────────────────────────────────
  shift.expectedClosingCashAmount = expectedCash;
  shift.actualClosingCashAmount = totalCash;
  shift.closingDenominations = closingDenominations;
  shift.cashDifferenceAmount = totalCash - expectedCash;
  shift.carryForwardAmount = safeCarry;
  shift.frozenAtClose = frozenAmount;
  shift.cashSalesTotal = totalCashSales; // persisted for day-closing aggregation
  // Kept for backward compat, zeroed since fund transfers are deprecated
  shift.totalFundWithdrawals = 0;
  shift.totalFundDeposits = 0;
  shift.status = "closed";

  const now = new Date();
  shift.closedAt = now;
  shift.closedBy = userId;
  if (note) shift.note = note;

  const closePeriod = getTimePeriod(now);
  const openLabel = periodIdToLabel(shift.openPeriod || "morning");
  const closeLabel = periodIdToLabel(closePeriod.id);

  let baseName;
  if (shift.openPeriod === closePeriod.id) {
    baseName = `${closeLabel} Shift`;
  } else {
    baseName = `${openLabel} - ${closeLabel} Shift`;
  }

  const { dateFilter } = getBusinessDateRange(shift.date);

  const sameNameCount = await Shift.countDocuments({
    branchId: shift.branchId,
    date: dateFilter,
    status: "closed",
    shiftName: { $regex: `^${baseName}`, $options: "i" },
    _id: { $ne: shift._id },
  });

  shift.shiftName = sameNameCount > 0 ? `${baseName} ${sameNameCount + 1}` : baseName;
  shift.closePeriod = closePeriod.id;

  await shift.save();
  return shift;
};

export const cancelShift = async (shiftId, userId, note) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.status === "closed") throw new ApiError(400, "Closed shift cannot be cancelled");

  shift.status = "cancelled";
  shift.closedAt = new Date();
  shift.closedBy = userId;
  if (note) shift.note = note;

  await shift.save();
  return shift;
};
