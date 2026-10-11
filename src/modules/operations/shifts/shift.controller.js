import asyncHandler from "../../../utils/asyncHandler.js";
import ApiError from "../../../utils/ApiError.js";
import { Shift } from "./shift.model.js";
import { DayClosing } from "../day-closings/dayClosing.model.js";
import { openShift as openShiftService, closeShift, cancelShift as cancelShiftService } from "./shift.service.js";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import FundTransfer from "../../finance/treasury/fund-transfers/models/fundTransfer.model.js";
import { FUND_TRANSFER_STATUS } from "../../finance/treasury/fund-transfers/constants/fundTransfer.constant.js";
import PaymentQr from "../../finance/treasury/payment-qr/models/paymentQr.model.js";
import BranchCash from "../../finance/treasury/cash-management/branch-cash/models/branchCash.model.js";
import { getTimePeriod } from "../../../utils/timePeriod.js";
import { getBusinessDateRange } from "../../../utils/businessDate.js";

export const createShift = asyncHandler(async (req, res, next) => {
  const branchId = req.headers["x-branch-id"] || req.branchId || req.query.branchId || req.body.branchId || null;
  
  if (!branchId) return next(new ApiError(400, "Branch ID is missing in context"));

  // Check by branchId only — ensure no shift is already open
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

  // Check if branch cash is initialized
  const branchCash = await BranchCash.findOne({ branchId });
  if (!branchCash) {
    return next(new ApiError(400, "Branch cash must be initialized before opening a shift. Please go to Treasury > Branch Cash to initialize it."));
  }

  // NOTE: date and businessDayId are now resolved inside openShiftService
  // from the active Business Day. We do not pass date from the request body.
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
    isDeleted: false,
    $or: [
      { shiftId: shift._id },
      { createdAt: { $gte: shift.openedAt || shift.createdAt, $lte: shiftEndTime } },
    ],
  };
  
  if (shift.branchId) {
    query.branchId = shift.branchId;
  }

  const invoices = await SalesInvoice.find(query).populate("customerId", "name phone");

  let invoiceCount = 0;
  let cashInvoiceCount = 0;
  let splitInvoiceCount = 0;
  let splitNet = 0;
  let splitCashAmount = 0;
  let splitUpiAmount = 0;
  let pureCashAmount = 0;
  let pureUpiAmount = 0;
  let netSales = 0;
  let paymentQrCount = 0;
  let qrNet = 0;
  let cashNet = 0;
  let returnCount = 0; // stubbed until SalesReturn is built
  let returnAmount = 0;

  // Cancelled metrics tracking
  let cancelledInvoiceCount = 0;
  let cancelledSalesTotal = 0;
  let cancelledCashTotal = 0;
  let cancelledUpiTotal = 0;
  let cancelledSplitTotal = 0;
  const cancelledInvoices = [];
  const cancelledBreakdown = {
    cash: { count: 0, amount: 0 },
    upi: { count: 0, amount: 0 },
    split: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    wallet: { count: 0, amount: 0 },
    other: { count: 0, amount: 0 },
  };

  // Per-UPI breakdown: { [paymentQrId]: { transactionCount, totalAmount, invoiceIds: Set } }
  const upiBreakdownRaw = {};

  const _trackUpi = (paymentQrId, amount, invoiceId, isSplit = false) => {
    const key = paymentQrId ? String(paymentQrId) : "unattributed";
    if (!upiBreakdownRaw[key]) {
      upiBreakdownRaw[key] = {
        transactionCount: 0,
        totalAmount: 0,
        invoiceIds: new Set(),
        pureBillCount: 0,
        splitBillCount: 0,
      };
    }
    upiBreakdownRaw[key].transactionCount++;
    upiBreakdownRaw[key].totalAmount += (Number(amount) || 0);
    if (invoiceId) {
      upiBreakdownRaw[key].invoiceIds.add(String(invoiceId));
    }
    if (isSplit) {
      upiBreakdownRaw[key].splitBillCount++;
    } else {
      upiBreakdownRaw[key].pureBillCount++;
    }
  };

  for (const inv of invoices) {
    if (inv.status === "Cancelled") {
      cancelledInvoiceCount += 1;
      const billTotal = Number(inv.grandTotal || 0);
      cancelledSalesTotal += billTotal;
      const isSplit = inv.paymentMethod === "Split";
      const pMethod = String(inv.paymentMethod || "CASH").toUpperCase();

      if (isSplit) {
        cancelledSplitTotal += billTotal;
        cancelledBreakdown.split.count += 1;
        cancelledBreakdown.split.amount += billTotal;
        if (Array.isArray(inv.payments)) {
          for (const p of inv.payments) {
            const pt = String(p.paymentType || p.mode || "").toUpperCase();
            const amt = Number(p.amount || 0);
            if (pt.includes("UPI") || pt.includes("QR")) {
              cancelledUpiTotal += amt;
            } else if (pt.includes("CASH")) {
              cancelledCashTotal += amt;
            }
          }
        }
      } else if (pMethod.includes("UPI") || pMethod.includes("QR")) {
        cancelledUpiTotal += billTotal;
        cancelledBreakdown.upi.count += 1;
        cancelledBreakdown.upi.amount += billTotal;
      } else if (pMethod.includes("CASH")) {
        cancelledCashTotal += billTotal;
        cancelledBreakdown.cash.count += 1;
        cancelledBreakdown.cash.amount += billTotal;
      } else if (pMethod.includes("CARD")) {
        cancelledBreakdown.card.count += 1;
        cancelledBreakdown.card.amount += billTotal;
      } else if (pMethod.includes("WALLET")) {
        cancelledBreakdown.wallet.count += 1;
        cancelledBreakdown.wallet.amount += billTotal;
      } else {
        cancelledBreakdown.other.count += 1;
        cancelledBreakdown.other.amount += billTotal;
      }

      cancelledInvoices.push({
        invoiceId: inv._id,
        invoiceNo: inv.invoiceNo,
        grandTotal: billTotal,
        paymentMethod: inv.paymentMethod || "Cash",
        payments: inv.payments || [],
        cancelledAt: inv.cancelledAt || inv.updatedAt || new Date(),
        cancelledBy: inv.cancelledBy || null,
        customerName: inv.customerId?.name || "Walk-in Customer",
      });
      continue;
    }

    // Active sales logic
    if (inv.grandTotal < 0) {
      returnCount++;
      returnAmount += Math.abs(inv.grandTotal);
    } else {
      invoiceCount++;
      netSales += inv.grandTotal;
    }

    if (inv.paymentMethod === "Split") {
      splitInvoiceCount++;
      splitNet += inv.grandTotal || 0;
      let billSplitCash = 0;
      let billSplitUpi = 0;
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const pType = p.paymentType ? p.paymentType.toUpperCase() : "CASH";
          const amt = Number(p.amount || 0);
          if (pType.includes("UPI") || pType.includes("QR")) {
            billSplitUpi += amt;
            _trackUpi(p.paymentQrId || inv.paymentQrId, amt, inv._id, true);
          } else if (pType.includes("CASH")) {
            billSplitCash += amt;
          } else if (!pType.includes("CARD") && !pType.includes("WALLET") && !pType.includes("CREDIT")) {
            billSplitCash += amt;
          }
        }
      } else {
        const tendered = Number(inv.cashTendered || 0);
        billSplitCash = Math.min(Number(inv.grandTotal || 0), tendered);
        billSplitUpi = Math.max(0, Number(inv.grandTotal || 0) - billSplitCash);
      }
      splitCashAmount += billSplitCash;
      splitUpiAmount += billSplitUpi;
      cashNet += billSplitCash;
      qrNet += billSplitUpi;
      // Note: splitInvoiceCount tracks split bills separately; pure cashInvoiceCount and paymentQrCount are NOT incremented
    } else {
      const pMethod = inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "CASH";

      if (pMethod.includes("UPI") || pMethod.includes("QR")) {
        paymentQrCount++;
        const amt = Number(inv.grandTotal || 0);
        pureUpiAmount += amt;
        qrNet += amt;
        _trackUpi(inv.paymentQrId, amt, inv._id, false);
      } else if (pMethod.includes("CASH")) {
        cashInvoiceCount++;
        const amt = (inv.cashTendered - inv.changeDue > 0) ? (inv.cashTendered - inv.changeDue) : Number(inv.grandTotal || 0);
        pureCashAmount += amt;
        cashNet += amt;
      } else {
        cashInvoiceCount++;
        const amt = Number(inv.grandTotal || 0);
        pureCashAmount += amt;
        cashNet += amt;
      }
    }
  }

  // Enrich upiBreakdown with PaymentQr & BankAccount metadata
  const qrIds = Object.keys(upiBreakdownRaw).filter(k => k !== "unattributed");
  let upiBreakdown = [];
  if (qrIds.length > 0) {
    const qrDocs = await PaymentQr.find({ _id: { $in: qrIds } })
      .populate({
        path: "bankAccountId",
        select: "accountName accountNumber ifscCode bankMasterId",
        populate: { path: "bankMasterId", select: "name shortName" },
      })
      .lean();
    const qrMap = {};
    for (const qr of qrDocs) qrMap[String(qr._id)] = qr;

    upiBreakdown = Object.entries(upiBreakdownRaw).map(([key, data]) => {
      const pureBillCount = data.pureBillCount || 0;
      const splitBillCount = data.splitBillCount || 0;
      const totalBillsForQr = (pureBillCount + splitBillCount) || (data.invoiceIds ? data.invoiceIds.size : data.transactionCount);
      if (key === "unattributed") {
        return {
          paymentQrId: null,
          upiId: "Unattributed",
          label: "Legacy / Untracked UPI",
          provider: null,
          bankAccountId: null,
          bankName: "Unlinked Bank",
          accountName: "Direct / Legacy UPI",
          accountNumber: "",
          qrImageUrl: null,
          transactionCount: data.transactionCount,
          billCount: totalBillsForQr,
          pureBillCount,
          splitBillCount,
          totalAmount: data.totalAmount,
        };
      }
      const qr = qrMap[key] || {};
      const bankAcct = qr.bankAccountId || {};
      const bankMaster = bankAcct.bankMasterId || {};
      const bankName = bankMaster.name || bankMaster.shortName || bankAcct.accountName || "Bank";
      return {
        paymentQrId: key,
        upiId: qr.upiId || key,
        label: qr.label || qr.upiId || "UPI QR",
        provider: qr.provider || null,
        bankAccountId: bankAcct._id || null,
        bankName,
        accountName: bankAcct.accountName || "",
        accountNumber: bankAcct.accountNumber ? `••••${String(bankAcct.accountNumber).slice(-4)}` : "",
        qrImageUrl: qr.qrImageUrl || null,
        transactionCount: data.transactionCount,
        billCount: totalBillsForQr,
        pureBillCount,
        splitBillCount,
        totalAmount: data.totalAmount,
      };
    });
  } else if (upiBreakdownRaw["unattributed"]) {
    const data = upiBreakdownRaw["unattributed"];
    const pureBillCount = data.pureBillCount || 0;
    const splitBillCount = data.splitBillCount || 0;
    const totalBillsForQr = (pureBillCount + splitBillCount) || (data.invoiceIds ? data.invoiceIds.size : data.transactionCount);
    upiBreakdown = [
      {
        paymentQrId: null,
        upiId: "Unattributed",
        label: "Legacy / Untracked UPI",
        provider: null,
        bankAccountId: null,
        bankName: "Unlinked Bank",
        accountName: "Direct / Legacy UPI",
        accountNumber: "",
        qrImageUrl: null,
        transactionCount: data.transactionCount,
        billCount: totalBillsForQr,
        pureBillCount,
        splitBillCount,
        totalAmount: data.totalAmount,
      },
    ];
  }

  // Fallback to shift.upiBreakdown if closed and calculated list is empty
  if (shift.status === "closed" && (!upiBreakdown || upiBreakdown.length === 0) && shift.upiBreakdown?.length > 0) {
    upiBreakdown = shift.upiBreakdown;
  }


  const expectedClosingCashAmount_raw = (shift.openingFloatAmount || 0) + cashNet;

  // Query fund transfers linked to this shift
  let withdrawals = [];
  let deposits = [];
  let totalWithdrawals = 0;
  let totalDeposits = 0;

  if (shift.manualDeposits && shift.manualDeposits.length > 0) {
    for (const dep of shift.manualDeposits) {
      deposits.push({
        _id: dep._id,
        amount: dep.amount,
        narration: dep.narration,
        transferDate: dep.date,
        createdBy: dep.createdBy?.fullName || "System",
        fromAccountName: "External",
      });
      totalDeposits += dep.amount;
    }
  }

  if (shift.manualWithdrawals && shift.manualWithdrawals.length > 0) {
    for (const w of shift.manualWithdrawals) {
      withdrawals.push({
        _id: w._id,
        amount: w.amount,
        narration: w.narration,
        transferDate: w.date,
        createdBy: w.createdBy?.fullName || "System",
        toAccountName: w.source === "running" ? "External (from Running)" : w.source === "frozen" ? "External (from Frozen)" : "External",
        source: w.source
      });
      
      // ONLY deduct from expected cash if it was taken from the running shift drawer!
      if (w.source === "running") {
        totalWithdrawals += w.amount;
      }
    }
  }

  // Fallback for older records that used FundTransfer for cash withdrawals/deposits
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
        // Money LEAVING the shift's cash account → Withdrawal (assumed from running in the old system)
        withdrawals.push({
          ...ftData,
          toAccountType: ft.toAccountType,
          toAccountName: ft.toCashAccountId?.accountName
            || ft.toBankAccountId?.accountName
            || "External",
          source: "running"
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
    pureCashInvoices: cashInvoiceCount,
    pureCashInvoiceCount: cashInvoiceCount,
    returnCount,
    expiryCount: 0,
    paymentQrCount,
    pureUpiInvoices: paymentQrCount,
    pureUpiInvoiceCount: paymentQrCount,
    invoiceAmount: netSales,
    returnAmount,
    expiryAmount: 0,
    netSales,
    cashIn: cashNet,
    cashOut: 0,
    cashNet,
    pureCashAmount,
    splitCashAmount,
    qrNet,
    pureUpiAmount,
    splitUpiAmount,
    splitInvoiceCount,
    splitNet,
    splitSalesTotal: splitNet,
    upiBreakdown,
    expectedClosingCashAmount,
    withdrawals,
    deposits,
    totalWithdrawals,
    totalDeposits,
    // Cancelled metrics & breakdown
    cancelledInvoiceCount: (shift.status === "closed" && shift.cancelledInvoiceCount != null) ? shift.cancelledInvoiceCount : cancelledInvoiceCount,
    cancelledSalesTotal: (shift.status === "closed" && shift.cancelledSalesTotal != null) ? shift.cancelledSalesTotal : cancelledSalesTotal,
    cancelledCashTotal: (shift.status === "closed" && shift.cancelledCashTotal != null) ? shift.cancelledCashTotal : cancelledCashTotal,
    cancelledUpiTotal: (shift.status === "closed" && shift.cancelledUpiTotal != null) ? shift.cancelledUpiTotal : cancelledUpiTotal,
    cancelledSplitTotal: (shift.status === "closed" && shift.cancelledSplitTotal != null) ? shift.cancelledSplitTotal : cancelledSplitTotal,
    cancelledInvoices: (shift.status === "closed" && shift.cancelledInvoices?.length > 0) ? shift.cancelledInvoices : cancelledInvoices,
    cancelledBreakdown: (shift.status === "closed" && shift.cancelledBreakdown?.cash) ? shift.cancelledBreakdown : cancelledBreakdown,
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
