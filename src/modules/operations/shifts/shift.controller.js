import asyncHandler from "../../../utils/asyncHandler.js";
import ApiError from "../../../utils/ApiError.js";
import { Shift } from "./shift.model.js";
import { openShift as openShiftService, closeShift, cancelShift as cancelShiftService } from "./shift.service.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";

export const createShift = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || req.body.branchId || null;
  
  if (!branchId) return next(new ApiError(400, "Branch ID is missing in context"));

  const existingShift = await Shift.findOne({ branchId, status: "open", openedBy: req.user?._id });
  if (existingShift) {
    return next(new ApiError(400, "You already have an open shift for this branch. Please close it first."));
  }

  const payload = {
    ...req.body,
    workspaceId: req.workspaceId,
    companyId: req.companyId,
    branchId,
    openedBy: req.user?._id,
    date: new Date(),
    shiftNo: `SHF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`
  };

  const shift = await openShiftService(payload);
  res.status(201).json({ success: true, data: shift });
});

export const listShifts = asyncHandler(async (req, res, next) => {
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
  
  const shifts = await Shift.find(filter).sort({ createdAt: -1 });
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
    expectedClosingCashAmount,
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
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    filter.date = { $gte: startOfDay, $lte: endOfDay };
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
  const { status, actualClosingCashAmount, closingDenominations, note } = req.body;
  const userId = req.user?._id;
  
  if (status === "closed") {
    const shift = await closeShift(req.params.id, userId, actualClosingCashAmount, closingDenominations, note);
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
