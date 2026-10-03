import asyncHandler from "../../../utils/asyncHandler.js";
import ApiError from "../../../utils/ApiError.js";
import { Shift } from "./shift.model.js";
import { DayClosing } from "../day-closings/dayClosing.model.js";
import { openShift as openShiftService, closeShift, cancelShift as cancelShiftService } from "./shift.service.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import FundTransfer from "../../finance/treasury/fund-transfers/models/fundTransfer.model.js";
import { FUND_TRANSFER_STATUS } from "../../finance/treasury/fund-transfers/constants/fundTransfer.constant.js";
import PaymentQr from "../../finance/treasury/payment-qr/models/paymentQr.model.js";
import { getTimePeriod } from "../../../utils/timePeriod.js";
import { getBusinessDateRange } from "../../../utils/businessDate.js";

export const createShift = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || req.body.branchId || null;
  
  if (!branchId) return next(new ApiError(400, "Branch ID is missing in context"));

  // Check by branchId only (not openedBy)
  const existingOpenShift = await Shift.findOne({ branchId, status: "open" });
  if (existingOpenShift) {
    return next(new ApiError(400, "A shift is already open for this branch. Please close it first."));
  }

  // Handle date selection: default today, optionally tomorrow
  const { canonicalDate, dateFilter, dateStr } = getBusinessDateRange(req.body.date);
  
  // Guard: no shift if that date already has a closed day closing
  const existingDC = await DayClosing.findOne({
    branchId,
    date: dateFilter,
    status: { $ne: "cancelled" }
  });
  if (existingDC) {
    return next(new ApiError(400, `Day closing already done for ${dateStr}. Cannot open shift.`));
  }

  const now = new Date();
  const openPeriod = getTimePeriod(now);

  const payload = {
    ...req.body,
    workspaceId: req.workspaceId,
    companyId: req.companyId,
    branchId,
    openedBy: req.user?._id,
    openedAt: now,
    date: canonicalDate,
    openPeriod: openPeriod.id,
    shiftNo: `SHF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`
  };

  const shift = await openShiftService(payload);
  res.status(201).json({ success: true, data: shift });
});

export const listShifts = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  const { date, status, sort = "desc" } = req.query;
  
  const filter = {
    workspaceId: req.workspaceId,
    companyId: req.companyId,
  };
  
  if (branchId) filter.branchId = branchId;
  if (date) {
    const { dateFilter } = getBusinessDateRange(date);
    filter.date = dateFilter;
  }
  if (status && status !== "all") filter.status = status;
  
  const sortOrder = sort === "asc" ? 1 : -1;
  const shifts = await Shift.find(filter)
    .sort({ createdAt: sortOrder })
    .populate("openedBy", "fullName email")
    .populate("closedBy", "fullName email");
    
  res.status(200).json({ success: true, data: shifts });
});

export const getOpenShift = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  if (!branchId) return next(new ApiError(400, "branchId is required"));
  const shift = await Shift.findOne({ branchId, status: "open" });
  if (!shift) return next(new ApiError(404, "No open shift found"));
  res.status(200).json({ success: true, data: shift });
});

export const getShiftById = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findById(req.params.id);
  if (!shift) return next(new ApiError(404, "Shift not found"));
  res.status(200).json({ success: true, data: shift });
});

export const getShiftSummary = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  const shift = await Shift.findById(id).populate("openedBy").populate("closedBy");
  if (!shift) return next(new ApiError(404, "Shift not found"));

  const shiftEndTime = shift.status === "closed" ? shift.closedAt : new Date();
  
  const query = {
    workspaceId: shift.workspaceId,
    companyId: shift.companyId,
    createdAt: { $gte: shift.openedAt || shift.createdAt, $lte: shiftEndTime },
    isDeleted: false,
  };
  
  if (shift.branchId) {
    query.branchId = shift.branchId;
  }

  const invoices = await SalesInvoice.find(query);

  let invoiceCount = 0;
  let cashInvoiceCount = 0;
  let netSales = 0;
  let paymentQrCount = 0;
  let qrNet = 0;
  let cashNet = 0;
  let returnCount = 0; // stubbed until SalesReturn is built
  let returnAmount = 0;

  // Per-UPI breakdown: { [paymentQrId]: { transactionCount, totalAmount } }
  const upiBreakdownRaw = {};

  const _trackUpi = (paymentQrId, amount) => {
    const key = paymentQrId ? String(paymentQrId) : "unattributed";
    if (!upiBreakdownRaw[key]) upiBreakdownRaw[key] = { transactionCount: 0, totalAmount: 0 };
    upiBreakdownRaw[key].transactionCount++;
    upiBreakdownRaw[key].totalAmount += amount;
  };

  for (const inv of invoices) {
    // If we model returns as negative grandTotals in the future:
    if (inv.grandTotal < 0) {
      returnCount++;
      returnAmount += Math.abs(inv.grandTotal);
    } else {
      invoiceCount++;
      netSales += inv.grandTotal;
    }

    if (inv.paymentMethod === "Split" && Array.isArray(inv.payments)) {
      let hasUpi = false;
      let hasCash = false;
      for (const p of inv.payments) {
        const pType = p.paymentType ? p.paymentType.toUpperCase() : "CASH";
        if (pType.includes("UPI") || pType.includes("QR")) {
          hasUpi = true;
          qrNet += (p.amount || 0);
          _trackUpi(p.paymentQrId, p.amount || 0);
        } else if (pType.includes("CASH")) {
          hasCash = true;
          cashNet += (p.amount || 0);
        } else if (!pType.includes("CARD") && !pType.includes("WALLET") && !pType.includes("CREDIT")) {
          hasCash = true;
          cashNet += (p.amount || 0);
        }
      }
      if (hasUpi) paymentQrCount++;
      if (hasCash) cashInvoiceCount++;
    } else {
      const pMethod = inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "CASH";

      if (pMethod.includes("UPI") || pMethod.includes("QR")) {
        paymentQrCount++;
        qrNet += inv.grandTotal;
        _trackUpi(inv.paymentQrId, inv.grandTotal);
      } else if (pMethod.includes("CASH")) {
        cashInvoiceCount++;
        cashNet += (inv.cashTendered - inv.changeDue > 0) ? (inv.cashTendered - inv.changeDue) : inv.grandTotal;
      } else {
        cashInvoiceCount++;
        cashNet += inv.grandTotal;
      }
    }
  }

  // Enrich upiBreakdown with PaymentQr metadata
  const qrIds = Object.keys(upiBreakdownRaw).filter(k => k !== "unattributed");
  let upiBreakdown = [];
  if (qrIds.length > 0) {
    const qrDocs = await PaymentQr.find({ _id: { $in: qrIds } }).select("upiId label provider").lean();
    const qrMap = {};
    for (const qr of qrDocs) qrMap[String(qr._id)] = qr;

    upiBreakdown = Object.entries(upiBreakdownRaw).map(([key, data]) => {
      if (key === "unattributed") {
        return { paymentQrId: null, upiId: "Unattributed", label: "Legacy / Untracked", provider: null, ...data };
      }
      const qr = qrMap[key] || {};
      return { paymentQrId: key, upiId: qr.upiId || key, label: qr.label || key, provider: qr.provider || null, ...data };
    });
  } else if (upiBreakdownRaw["unattributed"]) {
    upiBreakdown = [{ paymentQrId: null, upiId: "Unattributed", label: "Legacy / Untracked", provider: null, ...upiBreakdownRaw["unattributed"] }];
  }


  const expectedClosingCashAmount_raw = (shift.openingFloatAmount || 0) + cashNet;

  // Query fund transfers linked to this shift
  let withdrawals = [];
  let deposits = [];
  let totalWithdrawals = 0;
  let totalDeposits = 0;

  const shiftCashAccountId = shift.cashAccountId ? String(shift.cashAccountId) : null;

  if (shift._id) {
    const fundTransfers = await FundTransfer.find({
      shiftId: shift._id,
      status: FUND_TRANSFER_STATUS.POSTED,
      isDeleted: false,
    })
      .populate("fromCashAccountId", "accountName")
      .populate("toCashAccountId",   "accountName")
      .populate("fromBankAccountId", "accountName")
      .populate("toBankAccountId",   "accountName")
      .populate("createdBy",         "fullName");

    for (const ft of fundTransfers) {
      const fromId = ft.fromCashAccountId ? String(ft.fromCashAccountId._id || ft.fromCashAccountId) : null;
      const toId   = ft.toCashAccountId   ? String(ft.toCashAccountId._id   || ft.toCashAccountId)   : null;

      const ftData = {
        _id:            ft._id,
        transferNumber: ft.transferNumber,
        amount:         ft.amount,
        narration:      ft.narration,
        transferDate:   ft.transferDate,
        createdBy:      ft.createdBy?.fullName || "System",
      };

      if (shiftCashAccountId && fromId === shiftCashAccountId) {
        // Money LEAVING the shift's cash account → Withdrawal
        withdrawals.push({
          ...ftData,
          toAccountType: ft.toAccountType,
          toAccountName: ft.toCashAccountId?.accountName
            || ft.toBankAccountId?.accountName
            || "External",
        });
        totalWithdrawals += ft.amount;
      } else if (shiftCashAccountId && toId === shiftCashAccountId) {
        // Money ENTERING the shift's cash account → Deposit
        deposits.push({
          ...ftData,
          fromAccountType: ft.fromAccountType,
          fromAccountName: ft.fromCashAccountId?.accountName
            || ft.fromBankAccountId?.accountName
            || "External",
        });
        totalDeposits += ft.amount;
      }
    }
  }

  // Correct expected cash formula: Opening + Cash Sales − Withdrawals + Deposits
  const expectedClosingCashAmount = expectedClosingCashAmount_raw - totalWithdrawals + totalDeposits;

  const summary = {
    ...shift.toObject(),
    invoiceCount,
    cashInvoiceCount,
    returnCount,
    expiryCount: 0,
    paymentQrCount,
    invoiceAmount: netSales,
    returnAmount,
    expiryAmount: 0,
    netSales,
    cashIn: cashNet,
    cashOut: 0,
    cashNet,
    qrNet,
    upiBreakdown,
    expectedClosingCashAmount,
    withdrawals,
    deposits,
    totalWithdrawals,
    totalDeposits,
  };

  res.status(200).json({ success: true, data: summary });
});

export const getShiftByShiftNo = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findOne({ shiftNo: req.params.shiftNo });
  if (!shift) return next(new ApiError(404, "Shift not found"));
  res.status(200).json({ success: true, data: shift });
});

export const getShiftCountByDate = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  const { date } = req.query;
  
  const filter = { branchId };
  if (date) {
    const { dateFilter } = getBusinessDateRange(date);
    filter.date = dateFilter;
  }
  
  const count = await Shift.countDocuments(filter);
  res.status(200).json({ success: true, count });
});

export const updateShift = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!shift) return next(new ApiError(404, "Shift not found"));
  res.status(200).json({ success: true, data: shift });
});

export const updateShiftStatus = asyncHandler(async (req, res, next) => {
  const { status, actualClosingCashAmount, closingDenominations, note, carryForwardAmount, frozenDenominations } = req.body;
  const userId = req.user?._id;
  
  if (status === "closed") {
    const shift = await closeShift(
      req.params.id,
      userId,
      actualClosingCashAmount,
      closingDenominations,
      note,
      carryForwardAmount ?? 0,
      frozenDenominations ?? []
    );
    return res.status(200).json({ success: true, data: shift });
  }

  const shift = await Shift.findByIdAndUpdate(req.params.id, { status, note }, { new: true });
  res.status(200).json({ success: true, data: shift });
});

export const cancelShift = asyncHandler(async (req, res, next) => {
  const { note } = req.body;
  const userId = req.user?._id;
  const shift = await cancelShiftService(req.params.id, userId, note);
  res.status(200).json({ success: true, data: shift });
});

export const syncShiftController = asyncHandler(async (req, res, next) => {
  // Sync logic goes here if external POS integration is needed in the future.
  res.status(200).json({ success: true, message: "Sync not implemented in this version" });
});
