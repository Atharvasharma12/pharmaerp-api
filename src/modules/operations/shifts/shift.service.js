import { Shift } from "./shift.model.js";
import { DayClosing } from "../day-closings/dayClosing.model.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import CashAccount from "../../finance/treasury/cash-management/cash-accounts/models/cashAccount.model.js";
import FundTransfer from "../../finance/treasury/fund-transfers/models/fundTransfer.model.js";
import { FUND_TRANSFER_STATUS } from "../../finance/treasury/fund-transfers/constants/fundTransfer.constant.js";
import ApiError from "../../../utils/ApiError.js";
import { getTimePeriod, periodIdToLabel } from "../../../utils/timePeriod.js";

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
    cashAccountId: null,
    openingDenominations: data.openingDenominations || []
  });

  // Auto-link the branch's system default cash account to this shift for traceability
  if (branchId) {
    try {
      const systemDefaultCA = await CashAccount.findOne({
        workspaceId,
        companyId,
        branchId,
        isSystemDefault: true,
        isDeleted: false,
      });
      if (systemDefaultCA) {
        shift.cashAccountId = systemDefaultCA._id;
        await shift.save();
      } else {
        // Fallback: use branch primary (for legacy data)
        const primaryCA = await CashAccount.findOne({
          workspaceId,
          companyId,
          branchId,
          isPrimary: true,
          isDeleted: false,
        });
        if (primaryCA) {
          shift.cashAccountId = primaryCA._id;
          await shift.save();
        }
      }
    } catch (caErr) {
      console.warn("[Shift] Could not auto-link cash account:", caErr.message);
    }
  }

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
  const expectedCash_raw = shift.openingFloatAmount + totalCashSales;

  // Factor in fund transfers (withdrawals from / deposits into shift's cash account)
  let totalFundWithdrawals = 0;
  let totalFundDeposits = 0;

  if (shift.cashAccountId && shift._id) {
    const fundTransfers = await FundTransfer.find({
      shiftId: shift._id,
      status: FUND_TRANSFER_STATUS.POSTED,
      isDeleted: false,
    }).select("amount fromCashAccountId toCashAccountId");

    const shiftCaId = String(shift.cashAccountId);
    for (const ft of fundTransfers) {
      if (ft.fromCashAccountId && String(ft.fromCashAccountId) === shiftCaId) totalFundWithdrawals += ft.amount;
      if (ft.toCashAccountId   && String(ft.toCashAccountId)   === shiftCaId) totalFundDeposits   += ft.amount;
    }
  }

  // Correct formula: Opening + Cash Sales − Withdrawals + Deposits
  const expectedCash = expectedCash_raw - totalFundWithdrawals + totalFundDeposits;

  shift.expectedClosingCashAmount = expectedCash;
  shift.actualClosingCashAmount = actualClosingCashAmount;
  shift.closingDenominations = closingDenominations;
  shift.cashDifferenceAmount = actualClosingCashAmount - expectedCash;
  shift.totalFundWithdrawals = totalFundWithdrawals;
  shift.totalFundDeposits = totalFundDeposits;
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

  // Count existing closed shifts today with same name pattern
  const startOfDay = new Date(shift.date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(shift.date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const sameNameCount = await Shift.countDocuments({
    branchId: shift.branchId,
    date: { $gte: startOfDay, $lte: endOfDay },
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
