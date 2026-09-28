import asyncHandler from "../../../utils/asyncHandler.js";
import ApiError from "../../../utils/ApiError.js";
import { DayClosing } from "./dayClosing.model.js";
import { Shift } from "../shifts/shift.model.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import { createDayClosing as createDayClosingService, closeDayClosing, cancelDayClosing as cancelDayClosingService } from "./dayClosing.service.js";

// Helper function to calculate shift summary
const calculateShiftSummary = async (shift) => {
  const shiftEndTime = shift.status === "closed" ? shift.closedAt : new Date();
  
  const query = {
    workspaceId: shift.workspaceId,
    companyId: shift.companyId,
    createdAt: { $gte: shift.openedAt || shift.createdAt, $lte: shiftEndTime },
    isDeleted: false,
  };
  
  if (shift.branchId) query.branchId = shift.branchId;

  const invoices = await SalesInvoice.find(query);

  let invoiceCount = 0;
  let cashInvoiceCount = 0;
  let netSales = 0;
  let paymentQrCount = 0;
  let qrNet = 0;
  let cashNet = 0;

  for (const inv of invoices) {
    if (inv.status === "Cancelled") continue;
    invoiceCount++;
    netSales += inv.grandTotal;

    if (inv.paymentMethod === "Split" && Array.isArray(inv.payments)) {
      let hasUpi = false;
      let hasCash = false;
      for (const p of inv.payments) {
        const pType = p.paymentType ? p.paymentType.toUpperCase() : "CASH";
        if (pType.includes("UPI") || pType.includes("QR")) {
          hasUpi = true;
          qrNet += (p.amount || 0);
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
      } else if (pMethod.includes("CASH")) {
        cashInvoiceCount++;
        cashNet += (inv.cashTendered - inv.changeDue > 0) ? (inv.cashTendered - inv.changeDue) : inv.grandTotal;
      } else {
        cashInvoiceCount++;
        cashNet += inv.grandTotal;
      }
    }
  }

  const expectedClosingCashAmount = (shift.openingFloatAmount || 0) + cashNet;

  return {
    ...shift.toObject(),
    invoiceCount,
    cashInvoiceCount,
    paymentQrCount,
    netSales,
    cashNet,
    qrNet,
    expectedClosingCashAmount,
  };
};

export const getDraftDayClosingSummary = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  const { date } = req.query; // format YYYY-MM-DD
  
  if (!branchId) return next(new ApiError(400, "Branch ID required"));

  if (!date) return next(new ApiError(400, "Date is required"));

  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dateFilter = { $gte: startOfDay, $lte: endOfDay };

  // Check if a draft or closed day closing already exists for this date
  const existingDayClosing = await DayClosing.findOne({ branchId, date: dateFilter, status: { $ne: "cancelled" } });
  if (existingDayClosing) {
    return next(new ApiError(400, "A Day Closing already exists for this date."));
  }

  // Check if there are any OPEN shifts for this branch today
  const openShiftsCount = await Shift.countDocuments({ branchId, date: dateFilter, status: "open" });
  if (openShiftsCount > 0) {
    return next(new ApiError(400, "One or more shifts are still open. For day closing, all shifts must be closed."));
  }

  // Find all closed shifts for this date
  const shifts = await Shift.find({ branchId, date: dateFilter, status: "closed" }).sort({ openedAt: 1 });
  
  if (shifts.length === 0) {
    return res.status(200).json({ success: true, data: { shifts: [], message: "No closed shifts found for this date." } });
  }

  const shiftSummaries = await Promise.all(shifts.map(calculateShiftSummary));

  let totalInvoiceCount = 0;
  let totalCashInvoiceCount = 0;
  let totalPaymentQrCount = 0;
  let totalNetSales = 0;
  let totalCashNet = 0;
  let totalQrNet = 0;
  let totalExpected = 0;
  let totalActual = 0;
  let totalOpening = 0;

  shiftSummaries.forEach(s => {
    totalInvoiceCount += s.invoiceCount;
    totalCashInvoiceCount += s.cashInvoiceCount;
    totalPaymentQrCount += s.paymentQrCount;
    totalNetSales += s.netSales;
    totalCashNet += s.cashNet;
    totalQrNet += s.qrNet;
    totalExpected += s.expectedClosingCashAmount;
    totalActual += (s.actualClosingCashAmount || 0);
    totalOpening += (s.openingFloatAmount || 0);
  });

  const summary = {
    date,
    branchId,
    status: "preview",
    shifts: shiftSummaries,
    totalInvoiceCount,
    totalCashInvoiceCount,
    totalPaymentQrCount,
    totalNetSales,
    totalCashNet,
    totalQrNet,
    totalExpected,
    totalActual,
    totalOpening,
    cashDifferenceAmount: totalActual - totalExpected,
  };

  res.status(200).json({ success: true, data: summary });
});

export const getDayClosingSummary = asyncHandler(async (req, res, next) => {
  const dayClosing = await DayClosing.findById(req.params.id).populate("shifts");
  if (!dayClosing) return next(new ApiError(404, "Day Closing not found"));

  const shiftSummaries = await Promise.all(dayClosing.shifts.map(calculateShiftSummary));

  let totalInvoiceCount = 0;
  let totalCashInvoiceCount = 0;
  let totalPaymentQrCount = 0;
  let totalNetSales = 0;
  let totalCashNet = 0;
  let totalQrNet = 0;

  shiftSummaries.forEach(s => {
    totalInvoiceCount += s.invoiceCount;
    totalCashInvoiceCount += s.cashInvoiceCount;
    totalPaymentQrCount += s.paymentQrCount;
    totalNetSales += s.netSales;
    totalCashNet += s.cashNet;
    totalQrNet += s.qrNet;
  });

  const summary = {
    ...dayClosing.toObject(),
    shiftSummaries,
    totalInvoiceCount,
    totalCashInvoiceCount,
    totalPaymentQrCount,
    totalNetSales,
    totalCashNet,
    totalQrNet,
  };

  res.status(200).json({ success: true, data: summary });
});

export const createDayClosing = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || req.body.branchId || null;
  
  if (!branchId) return next(new ApiError(400, "Branch ID is missing in context"));

  const payload = {
    ...req.body,
    workspaceId: req.workspaceId,
    companyId: req.companyId,
    branchId,
    createdBy: req.user?._id,
    date: new Date(),
    dayClosingNo: `DC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`
  };

  const dayClosing = await createDayClosingService(payload);
  res.status(201).json({ success: true, data: dayClosing });
});

export const listDayClosings = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  const { date } = req.query;
  
  const filter = {
    workspaceId: req.workspaceId,
    companyId: req.companyId,
  };
  
  if (branchId) filter.branchId = branchId;
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    filter.date = { $gte: startOfDay, $lte: endOfDay };
  }

  const dayClosings = await DayClosing.find(filter).sort({ createdAt: -1 }).populate("shifts");
  res.status(200).json({ success: true, data: dayClosings });
});

export const getDayClosingById = asyncHandler(async (req, res, next) => {
  const dayClosing = await DayClosing.findById(req.params.id).populate("shifts");
  if (!dayClosing) return next(new ApiError(404, "Day Closing not found"));
  res.status(200).json({ success: true, data: dayClosing });
});

export const updateDayClosing = asyncHandler(async (req, res, next) => {
  const dayClosing = await DayClosing.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!dayClosing) return next(new ApiError(404, "Day Closing not found"));
  res.status(200).json({ success: true, data: dayClosing });
});

export const updateDayClosingStatus = asyncHandler(async (req, res, next) => {
  const { status, note } = req.body;
  const userId = req.user?._id;
  
  if (status === "closed") {
    const dayClosing = await closeDayClosing(req.params.id, userId, note);
    return res.status(200).json({ success: true, data: dayClosing });
  }

  const dayClosing = await DayClosing.findByIdAndUpdate(req.params.id, { status, note }, { new: true });
  res.status(200).json({ success: true, data: dayClosing });
});

export const cancelDayClosing = asyncHandler(async (req, res, next) => {
  const { note } = req.body;
  const userId = req.user?._id;
  const dayClosing = await cancelDayClosingService(req.params.id, userId, note);
  res.status(200).json({ success: true, data: dayClosing });
});

export const syncDayClosingController = asyncHandler(async (req, res, next) => {
  // Sync logic for POS
  res.status(200).json({ success: true, message: "Sync not implemented in this version" });
});
