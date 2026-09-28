import { DayClosing } from "./dayClosing.model.js";
import { Shift } from "../shifts/shift.model.js";
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

  shifts.forEach((shift) => {
    expectedTotal += shift.expectedClosingCashAmount;
    actualTotal += shift.actualClosingCashAmount;
    openingTotal += shift.openingFloatAmount;
  });

  const dayClosing = await DayClosing.create({
    ...data,
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
