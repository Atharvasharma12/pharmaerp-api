import { DayClosing } from "./dayClosing.model.js";
import { Shift } from "../shifts/shift.model.js";
import ApiError from "../../../utils/ApiError.js";
import { getBusinessDateRange } from "../../../utils/businessDate.js";

export const createDayClosing = async (data) => {
  const { branchId, date } = data;

  const { dateFilter, canonicalDate } = getBusinessDateRange(date);

  const existing = await DayClosing.findOne({ branchId, date: dateFilter, status: { $ne: "cancelled" } });
  if (existing) {
    throw new ApiError(400, "Day closing already exists for this date");
  }

  // Ensure all shifts for this date are closed
  const openShifts = await Shift.find({ branchId, date: dateFilter, status: "open" });
  if (openShifts.length > 0) {
    throw new ApiError(400, "All shifts for this date must be closed before creating day closing.");
  }

  const shifts = await Shift.find({ branchId, date: dateFilter, status: "closed" });
  
  let expectedTotal = 0;
  let actualTotal = 0;
  let openingTotal = 0;
  let openingDenominations = [];
  let closingDenominations = [];
  let totalFundWithdrawals = 0;
  let totalFundDeposits = 0;

  if (shifts.length > 0) {
    // Sort shifts by open time to reliably get first/last
    shifts.sort((a, b) => new Date(a.openedAt || a.createdAt) - new Date(b.openedAt || b.createdAt));
    
    const firstShift = shifts[0];
    const lastShift = shifts[shifts.length - 1];

    openingTotal = firstShift.openingFloatAmount || 0;
    openingDenominations = firstShift.openingDenominations || [];
    expectedTotal = lastShift.expectedClosingCashAmount || 0;
    actualTotal = lastShift.actualClosingCashAmount || 0;
    closingDenominations = lastShift.closingDenominations || [];

    totalFundWithdrawals = shifts.reduce((sum, s) => sum + (s.totalFundWithdrawals || 0), 0);
    totalFundDeposits = shifts.reduce((sum, s) => sum + (s.totalFundDeposits || 0), 0);
  }

  const dayClosing = await DayClosing.create({
    ...data,
    date: canonicalDate,
    shifts: shifts.map(s => s._id),
    openingFloatAmount: openingTotal,
    openingDenominations,
    expectedClosingCashAmount: expectedTotal,
    actualClosingCashAmount: actualTotal,
    closingDenominations,
    totalFundWithdrawals,
    totalFundDeposits,
    cashDifferenceAmount: actualTotal - expectedTotal,
  });

  return dayClosing;
};

export const closeDayClosing = async (dayClosingId, userId, actualClosingCashAmount, closingDenominations = [], note) => {
  const dayClosing = await DayClosing.findById(dayClosingId).populate("shifts");
  if (!dayClosing) throw new ApiError(404, "Day closing not found");
  if (dayClosing.status === "closed") throw new ApiError(400, "Day closing is already closed");

  const { dateFilter } = getBusinessDateRange(dayClosing.date);

  const openShifts = await Shift.find({ branchId: dayClosing.branchId, date: dateFilter, status: "open" });
  if (openShifts.length > 0) {
    throw new ApiError(400, "All shifts for this date must be closed before closing the day.");
  }

  if (actualClosingCashAmount !== undefined && actualClosingCashAmount !== null) {
    dayClosing.actualClosingCashAmount = Number(actualClosingCashAmount);
    dayClosing.closingDenominations = closingDenominations;
    dayClosing.cashDifferenceAmount = Number(actualClosingCashAmount) - (dayClosing.expectedClosingCashAmount || 0);
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
