import { Shift } from "./shift.model.js";
import { DayClosing } from "../day-closings/dayClosing.model.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import ApiError from "../../../utils/ApiError.js";

export const openShift = async (data) => {
  const { workspaceId, companyId, branchId, date } = data;

  // Ensure no open day closing for this date
  const dayClosing = await DayClosing.findOne({ branchId, date, status: { $ne: "cancelled" } });
  if (dayClosing) {
    throw new ApiError(400, "A day closing process already exists for this date.");
  }

  // Ensure no currently open shift for this branch
  const openShift = await Shift.findOne({ branchId, status: "open" });
  if (openShift) {
    throw new ApiError(400, "An open shift already exists for this branch. Please close it first.");
  }

  const shift = await Shift.create({
    ...data,
    openingDenominations: data.openingDenominations || []
  });
  return shift;
};

export const closeShift = async (shiftId, userId, actualClosingCashAmount, closingDenominations = [], note) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.status !== "open") throw new ApiError(400, "Shift is not open");

  // Calculate expected cash dynamically
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
      const cashPayments = inv.payments.filter(p => {
        const pt = p.paymentType ? p.paymentType.toUpperCase() : "CASH";
        return pt.includes("CASH") || (!pt.includes("UPI") && !pt.includes("QR") && !pt.includes("CARD") && !pt.includes("WALLET") && !pt.includes("CREDIT"));
      });
      return sum + cashPayments.reduce((s, p) => s + (p.amount || 0), 0);
    } else {
      const pMethod = inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "CASH";
      if (pMethod.includes("UPI") || pMethod.includes("QR")) {
        return sum;
      }
      // Default cash behavior
      const cashCollected = (inv.cashTendered - inv.changeDue > 0) ? (inv.cashTendered - inv.changeDue) : (inv.grandTotal || 0);
      return sum + cashCollected;
    }
  }, 0);
  const expectedCash = shift.openingFloatAmount + totalCashSales;

  shift.expectedClosingCashAmount = expectedCash;
  shift.actualClosingCashAmount = actualClosingCashAmount;
  shift.closingDenominations = closingDenominations;
  shift.cashDifferenceAmount = actualClosingCashAmount - expectedCash;
  shift.status = "closed";
  shift.closedAt = new Date();
  shift.closedBy = userId;
  if (note) shift.note = note;

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
