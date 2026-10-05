import asyncHandler from "../../../utils/asyncHandler.js";
import ApiError from "../../../utils/ApiError.js";
import { BusinessDay } from "./businessDay.model.js";
import { Shift } from "../shifts/shift.model.js";
import BankDepositSlip from "../../finance/treasury/bank-deposit-slips/models/bankDepositSlip.model.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import FundTransfer from "../../finance/treasury/fund-transfers/models/fundTransfer.model.js";
import { FUND_TRANSFER_STATUS } from "../../finance/treasury/fund-transfers/constants/fundTransfer.constant.js";
import PaymentQr from "../../finance/treasury/payment-qr/models/paymentQr.model.js";
import {
  openBusinessDay as openBusinessDayService,
  closeBusinessDay as closeBusinessDayService,
  cancelBusinessDay as cancelBusinessDayService,
  getOpenBusinessDay as getOpenBusinessDayService,
  getSuggestedBusinessDate as getSuggestedBusinessDateService,
} from "./businessDay.service.js";

// ── Shared helpers (reused from shift summary logic) ─────────────────────────

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

  const upiBreakdownRaw = {};

  const _trackUpi = (paymentQrId, amount) => {
    const key = paymentQrId ? String(paymentQrId) : "unattributed";
    if (!upiBreakdownRaw[key]) upiBreakdownRaw[key] = { transactionCount: 0, totalAmount: 0 };
    upiBreakdownRaw[key].transactionCount++;
    upiBreakdownRaw[key].totalAmount += amount;
  };

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
          qrNet += p.amount || 0;
          _trackUpi(p.paymentQrId, p.amount || 0);
        } else if (pType.includes("CASH")) {
          hasCash = true;
          cashNet += p.amount || 0;
        } else if (!pType.includes("CARD") && !pType.includes("WALLET") && !pType.includes("CREDIT")) {
          hasCash = true;
          cashNet += p.amount || 0;
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
        cashNet += inv.cashTendered - inv.changeDue > 0
          ? inv.cashTendered - inv.changeDue
          : inv.grandTotal;
      } else {
        cashInvoiceCount++;
        cashNet += inv.grandTotal;
      }
    }
  }

  // Enrich UPI breakdown with metadata
  const qrIds = Object.keys(upiBreakdownRaw).filter((k) => k !== "unattributed");
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

  const expectedClosingCashAmount =
    shift.expectedClosingCashAmount !== undefined && shift.status === "closed"
      ? shift.expectedClosingCashAmount
      : (shift.openingFloatAmount || 0) + cashNet - (shift.totalFundWithdrawals || 0) + (shift.totalFundDeposits || 0);

  return {
    ...shift.toObject(),
    invoiceCount,
    cashInvoiceCount,
    paymentQrCount,
    netSales,
    cashNet,
    qrNet,
    upiBreakdown,
    expectedClosingCashAmount,
  };
};

const fetchFundTransfers = async ({ shiftIds = [], businessDayId = null }) => {
  const orConditions = [];
  if (shiftIds.length > 0) orConditions.push({ shiftId: { $in: shiftIds } });
  if (businessDayId) orConditions.push({ businessDayId });

  if (orConditions.length === 0) {
    return { withdrawals: [], deposits: [], totalWithdrawals: 0, totalDeposits: 0 };
  }

  const fundTransfers = await FundTransfer.find({
    $or: orConditions,
    status: FUND_TRANSFER_STATUS.POSTED,
    isDeleted: false,
  })
    .populate("fromBankAccountId", "accountName")
    .populate("toBankAccountId", "accountName")
    .populate("createdBy", "fullName");

  const withdrawals = [];
  const deposits = [];
  let totalWithdrawals = 0;
  let totalDeposits = 0;

  for (const ft of fundTransfers) {
    const ftData = {
      _id: ft._id,
      transferNumber: ft.transferNumber,
      amount: ft.amount,
      narration: ft.narration,
      transferDate: ft.transferDate,
      createdBy: ft.createdBy?.fullName || "System",
    };

    if (ft.fromAccountType === "CASH") {
      withdrawals.push({
        ...ftData,
        toAccountType: ft.toAccountType,
        toAccountName: ft.toCashAccountId?.accountName || ft.toBankAccountId?.accountName || "External",
      });
      totalWithdrawals += ft.amount;
    } else if (ft.toAccountType === "CASH") {
      deposits.push({
        ...ftData,
        fromAccountType: ft.fromAccountType,
        fromAccountName: ft.fromCashAccountId?.accountName || ft.fromBankAccountId?.accountName || "External",
      });
      totalDeposits += ft.amount;
    }
  }

  return { withdrawals, deposits, totalWithdrawals, totalDeposits };
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /operations/business-days
 * Opens a new Business Day.
 */
export const openBusinessDay = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.body.branchId || null;
  if (!branchId) return next(new ApiError(400, "Branch ID is missing"));

  const payload = {
    workspaceId: req.workspaceId,
    companyId: req.companyId,
    branchId,
    businessDate: req.body.businessDate || req.body.date || new Date(),
    createdBy: req.user?._id,
    note: req.body.note,
  };

  const businessDay = await openBusinessDayService(payload);
  res.status(201).json({ success: true, data: businessDay });
});

/**
 * GET /operations/business-days
 * Lists all Business Days with optional filters.
 */
export const listBusinessDays = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  const { date, status, sort = "desc" } = req.query;

  const filter = {
    workspaceId: req.workspaceId,
    companyId: req.companyId,
  };

  if (branchId) filter.branchId = branchId;
  if (date) {
    const d = new Date(date);
    const canonical = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    filter.businessDate = canonical;
  }
  if (status && status !== "all") filter.status = status;

  const sortOrder = sort === "asc" ? 1 : -1;
  const businessDays = await BusinessDay.find(filter)
    .sort({ businessDate: sortOrder })
    .populate("shifts")
    .populate("createdBy", "fullName email")
    .populate("closedBy", "fullName email");

  res.status(200).json({ success: true, data: businessDays });
});

/**
 * GET /operations/business-days/open
 * Returns the currently OPEN Business Day for a branch, or 404.
 * Used by the frontend persistent status banner.
 */
export const getOpenBusinessDay = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  if (!branchId) return next(new ApiError(400, "Branch ID is required"));

  const businessDay = await getOpenBusinessDayService(branchId);
  if (!businessDay) return next(new ApiError(404, "No open Business Day found for this branch"));

  await businessDay.populate("shifts");

  // Also fetch the currently open shift (if any) to include in response
  const openShift = await Shift.findOne({ businessDayId: businessDay._id, status: "open" });

  res.status(200).json({
    success: true,
    data: { ...businessDay.toObject(), currentOpenShift: openShift || null },
  });
});

/**
 * GET /operations/business-days/suggested-date
 * Returns the suggested businessDate for the next Business Day opening.
 */
export const getSuggestedBusinessDate = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || null;
  if (!branchId) return next(new ApiError(400, "Branch ID is required"));

  const suggestion = await getSuggestedBusinessDateService(branchId);
  res.status(200).json({ success: true, data: suggestion });
});

/**
 * GET /operations/business-days/:id
 * Returns a single Business Day by ID.
 */
export const getBusinessDayById = asyncHandler(async (req, res, next) => {
  const businessDay = await BusinessDay.findById(req.params.id).populate("shifts");
  if (!businessDay) return next(new ApiError(404, "Business Day not found"));
  res.status(200).json({ success: true, data: businessDay });
});

/**
 * GET /operations/business-days/:id/summary
 * Returns a Business Day with full shift-level financial summary.
 */
export const getBusinessDaySummary = asyncHandler(async (req, res, next) => {
  const businessDay = await BusinessDay.findById(req.params.id).populate("shifts");
  if (!businessDay) return next(new ApiError(404, "Business Day not found"));

  const shiftSummaries = await Promise.all(businessDay.shifts.map(calculateShiftSummary));

  let totalInvoiceCount = 0;
  let totalCashInvoiceCount = 0;
  let totalPaymentQrCount = 0;
  let totalNetSales = 0;
  let totalCashNet = 0;
  let totalQrNet = 0;
  const upiBreakdownRaw = {};

  shiftSummaries.forEach((s) => {
    totalInvoiceCount += s.invoiceCount;
    totalCashInvoiceCount += s.cashInvoiceCount;
    totalPaymentQrCount += s.paymentQrCount;
    totalNetSales += s.netSales;
    totalCashNet += s.cashNet;
    totalQrNet += s.qrNet;

    if (s.upiBreakdown && Array.isArray(s.upiBreakdown)) {
      s.upiBreakdown.forEach((upi) => {
        const key = upi.paymentQrId || "unattributed";
        if (!upiBreakdownRaw[key]) {
          upiBreakdownRaw[key] = { ...upi, transactionCount: 0, totalAmount: 0 };
        }
        upiBreakdownRaw[key].transactionCount += upi.transactionCount;
        upiBreakdownRaw[key].totalAmount += upi.totalAmount;
      });
    }
  });

  const upiBreakdown = Object.values(upiBreakdownRaw);
  const shiftIds = (businessDay.shifts || []).map((s) => s._id);
  const ftData = await fetchFundTransfers({ shiftIds, businessDayId: businessDay._id });
  
  const bankSlips = await BankDepositSlip.find({
    businessDayId: businessDay._id,
    isDeleted: false,
    status: { $ne: "cancelled" }
  }).lean();

  const totalFundWithdrawals = businessDay.totalFundWithdrawals || ftData.totalWithdrawals;
  const totalFundDeposits = businessDay.totalFundDeposits || ftData.totalDeposits;

  let openingFloatAmount = businessDay.openingFloatAmount || 0;
  let expectedClosingCashAmount = businessDay.expectedClosingCashAmount || 0;
  let openingDenominations = businessDay.openingDenominations || [];

  if (businessDay.status === "open" && shiftSummaries.length > 0) {
    openingFloatAmount = shiftSummaries[0].openingFloatAmount || 0;
    openingDenominations = shiftSummaries[0].openingDenominations || [];
    expectedClosingCashAmount = openingFloatAmount + totalCashNet + totalFundDeposits - totalFundWithdrawals;
  }

  const summary = {
    ...businessDay.toObject(),
    shiftSummaries,
    totalInvoiceCount,
    totalCashInvoiceCount,
    totalPaymentQrCount,
    totalNetSales,
    totalCashNet,
    totalQrNet,
    upiBreakdown,
    withdrawals: ftData.withdrawals,
    deposits: ftData.deposits,
    totalWithdrawals: totalFundWithdrawals,
    totalDeposits: totalFundDeposits,
    openingFloatAmount,
    expectedClosingCashAmount,
    openingDenominations,
    closingDenominations: businessDay.closingDenominations || [],
    bankSlips,
  };

  res.status(200).json({ success: true, data: summary });
});

/**
 * PATCH /operations/business-days/:id/close
 * Closes an open Business Day and aggregates all financial data.
 */
export const closeBusinessDay = asyncHandler(async (req, res, next) => {
  const { actualClosingCashAmount, closingDenominations, note } = req.body;
  const userId = req.user?._id;

  const businessDay = await closeBusinessDayService(req.params.id, userId, {
    actualClosingCashAmount,
    closingDenominations,
    note,
  });

  res.status(200).json({ success: true, data: businessDay });
});

/**
 * PATCH /operations/business-days/:id/cancel
 * Cancels an open Business Day.
 */
export const cancelBusinessDay = asyncHandler(async (req, res, next) => {
  const { note } = req.body;
  const userId = req.user?._id;
  const businessDay = await cancelBusinessDayService(req.params.id, userId, note);
  res.status(200).json({ success: true, data: businessDay });
});
