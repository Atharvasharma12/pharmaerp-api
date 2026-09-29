import { DayClosing } from "./dayClosing.model.js";
import { Shift } from "../shifts/shift.model.js";
import CashAccount from "../../finance/treasury/cash-management/cash-accounts/models/cashAccount.model.js";
import ApiError from "../../../utils/ApiError.js";

export const createDayClosing = async (data) => {
  const { branchId, date } = data;

  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dateFilter = { $gte: startOfDay, $lte: endOfDay };

  const existing = await DayClosing.findOne({ branchId, date: dateFilter, status: { $ne: "cancelled" } });
  if (existing) {
    throw new ApiError(400, "Day closing already exists for this date");
  }

  const shifts = await Shift.find({ branchId, date: dateFilter, status: "closed" });
  
  let expectedTotal = 0;
  let actualTotal = 0;
  let openingTotal = 0;

  if (shifts.length > 0) {
    // Sort shifts by open time to reliably get first/last
    shifts.sort((a, b) => new Date(a.openedAt || a.createdAt) - new Date(b.openedAt || b.createdAt));
    
    const firstShift = shifts[0];
    const lastShift = shifts[shifts.length - 1];

    openingTotal = firstShift.openingFloatAmount || 0;
    expectedTotal = lastShift.expectedClosingCashAmount || 0;
    actualTotal = lastShift.actualClosingCashAmount || 0;
  }

  // Resolve the branch's system default cash account for traceability
  let resolvedCashAccountId = null;
  if (branchId) {
    try {
      const systemDefaultCA = await CashAccount.findOne({
        branchId,
        isSystemDefault: true,
        isDeleted: false,
      });
      if (systemDefaultCA) {
        resolvedCashAccountId = systemDefaultCA._id;
      } else {
        // Fallback: branch primary (legacy)
        const primaryCA = await CashAccount.findOne({
          branchId,
          isPrimary: true,
          isDeleted: false,
        });
        if (primaryCA) resolvedCashAccountId = primaryCA._id;
      }
    } catch (caErr) {
      console.warn("[DayClosing] Could not resolve cash account:", caErr.message);
    }
  }

  const dayClosing = await DayClosing.create({
    ...data,
    cashAccountId: resolvedCashAccountId,
    shifts: shifts.map(s => s._id),
    openingFloatAmount: openingTotal,
    expectedClosingCashAmount: expectedTotal,
    actualClosingCashAmount: actualTotal,
    cashDifferenceAmount: actualTotal - expectedTotal,
  });

  return dayClosing;
};

export const closeDayClosing = async (dayClosingId, userId, note) => {
  const dayClosing = await DayClosing.findById(dayClosingId).populate("shifts");
  if (!dayClosing) throw new ApiError(404, "Day closing not found");
  if (dayClosing.status === "closed") throw new ApiError(400, "Day closing is already closed");

  const startOfDay = new Date(dayClosing.date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(dayClosing.date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dateFilter = { $gte: startOfDay, $lte: endOfDay };

  const openShifts = await Shift.find({ branchId: dayClosing.branchId, date: dateFilter, status: "open" });
  if (openShifts.length > 0) {
    throw new ApiError(400, "All shifts for this date must be closed before closing the day.");
  }

  dayClosing.status = "closed";
  dayClosing.closedAt = new Date();
  dayClosing.approvedBy = userId;
  if (note) dayClosing.note = note;

  // Emit event or interact with finance module here to post journal vouchers
  
  await dayClosing.save();
  return dayClosing;
};

export const cancelDayClosing = async (dayClosingId, userId, note) => {
  const dayClosing = await DayClosing.findById(dayClosingId);
  if (!dayClosing) throw new ApiError(404, "Day closing not found");
  if (dayClosing.status === "closed") throw new ApiError(400, "Closed day closing cannot be cancelled");

  dayClosing.status = "cancelled";
  dayClosing.closedAt = new Date();
  if (note) dayClosing.note = note;

  await dayClosing.save();
  return dayClosing;
};
