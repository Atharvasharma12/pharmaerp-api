import mongoose from "mongoose";
import SalesInvoice from "../../../../sales/invoices/models/invoice.model.js";
import PaymentQr from "../models/paymentQr.model.js";
import ApiError from "../../../../../utils/ApiError.js";

/**
 * Aggregates transaction statistics for a specific PaymentQr (UPI VPA).
 *
 * Handles two cases:
 * 1. Single-method UPI invoices where SalesInvoice.paymentQrId === id
 * 2. Split-payment invoices where any payments[].paymentQrId === id
 *    (uses the sub-payment amount, not the full invoice grandTotal)
 *
 * Returns:
 *   { totalTransactions, totalAmount, todayAmount, thisMonthAmount, recentTransactions }
 */
const getPaymentQrStats = async (paymentQrId, companyId, workspaceId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(paymentQrId)) {
    throw new ApiError(400, "Invalid Payment QR ID");
  }

  const qrObjId = new mongoose.Types.ObjectId(paymentQrId);

  // Verify the QR belongs to this company/workspace
  const qr = await PaymentQr.findOne({
    _id: qrObjId,
    companyId,
    workspaceId,
    isDeleted: false,
  }).lean();

  if (!qr) throw new ApiError(404, "Payment QR not found");

  // Date helpers
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Optional date range filter from query
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
  const dateTo = query.dateTo ? new Date(query.dateTo) : null;

  // -----------------------------------------------------------------------
  // Pipeline 1: Single-method UPI invoices  (paymentQrId at top level)
  // -----------------------------------------------------------------------
  const singleMethodMatch = {
    companyId: new mongoose.Types.ObjectId(companyId),
    paymentQrId: qrObjId,
    isDeleted: false,
    status: { $ne: "Cancelled" },
  };
  if (dateFrom || dateTo) {
    singleMethodMatch.date = {};
    if (dateFrom) singleMethodMatch.date.$gte = dateFrom;
    if (dateTo) singleMethodMatch.date.$lte = dateTo;
  }

  // -----------------------------------------------------------------------
  // Pipeline 2: Split-payment invoices  (paymentQrId inside payments[])
  // -----------------------------------------------------------------------
  const splitMethodMatch = {
    companyId: new mongoose.Types.ObjectId(companyId),
    "payments.paymentQrId": qrObjId,
    isDeleted: false,
    status: { $ne: "Cancelled" },
  };
  if (dateFrom || dateTo) {
    splitMethodMatch.date = {};
    if (dateFrom) splitMethodMatch.date.$gte = dateFrom;
    if (dateTo) splitMethodMatch.date.$lte = dateTo;
  }

  // Run all aggregations in parallel for speed
  const [
    singleAll,
    singleToday,
    singleMonth,
    splitAll,
    splitToday,
    splitMonth,
    recentSingle,
    recentSplit,
  ] = await Promise.all([
    // --- ALL TIME ---
    SalesInvoice.aggregate([
      { $match: singleMethodMatch },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),
    SalesInvoice.aggregate([
      { $match: { ...singleMethodMatch, date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),
    SalesInvoice.aggregate([
      { $match: { ...singleMethodMatch, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),

    // --- SPLIT PAYMENTS (use individual sub-payment amount) ---
    SalesInvoice.aggregate([
      { $match: splitMethodMatch },
      { $unwind: "$payments" },
      {
        $match: {
          "payments.paymentQrId": qrObjId,
          "payments.amount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payments.amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    SalesInvoice.aggregate([
      { $match: { ...splitMethodMatch, date: { $gte: todayStart, $lte: todayEnd } } },
      { $unwind: "$payments" },
      { $match: { "payments.paymentQrId": qrObjId, "payments.amount": { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$payments.amount" }, count: { $sum: 1 } } },
    ]),
    SalesInvoice.aggregate([
      { $match: { ...splitMethodMatch, date: { $gte: monthStart, $lte: monthEnd } } },
      { $unwind: "$payments" },
      { $match: { "payments.paymentQrId": qrObjId, "payments.amount": { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$payments.amount" }, count: { $sum: 1 } } },
    ]),

    // --- RECENT TRANSACTIONS (last 15, single-method) ---
    SalesInvoice.find(singleMethodMatch)
      .sort({ date: -1 })
      .limit(15)
      .select("invoiceNo date grandTotal paymentMethod customerId status")
      .populate({ path: "customerId", select: "name mobile" })
      .lean(),

    // --- RECENT TRANSACTIONS (last 15, split-method) ---
    SalesInvoice.aggregate([
      { $match: splitMethodMatch },
      { $unwind: "$payments" },
      { $match: { "payments.paymentQrId": qrObjId, "payments.amount": { $gt: 0 } } },
      { $sort: { date: -1 } },
      { $limit: 15 },
      {
        $project: {
          invoiceNo: 1,
          date: 1,
          grandTotal: "$payments.amount",
          paymentMethod: 1,
          customerId: 1,
          status: 1,
          isSplit: { $literal: true },
        },
      },
    ]),
  ]);

  // Merge single + split totals
  const allTotal   = (singleAll[0]?.total   || 0) + (splitAll[0]?.total   || 0);
  const allCount   = (singleAll[0]?.count   || 0) + (splitAll[0]?.count   || 0);
  const todayTotal = (singleToday[0]?.total || 0) + (splitToday[0]?.total || 0);
  const todayCount = (singleToday[0]?.count || 0) + (splitToday[0]?.count || 0);
  const monthTotal = (singleMonth[0]?.total || 0) + (splitMonth[0]?.total || 0);
  const monthCount = (singleMonth[0]?.count || 0) + (splitMonth[0]?.count || 0);

  // Merge + sort recent transactions (deduplicate by _id, prefer single-method entry)
  const recentMap = new Map();
  for (const inv of [...recentSingle, ...recentSplit]) {
    const key = String(inv._id);
    if (!recentMap.has(key)) recentMap.set(key, inv);
  }
  const recentTransactions = [...recentMap.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .map((inv) => ({
      _id: inv._id,
      invoiceNo: inv.invoiceNo,
      date: inv.date,
      amount: inv.grandTotal,
      paymentMethod: inv.paymentMethod,
      status: inv.status,
      customer: inv.customerId
        ? { name: inv.customerId.name || "Walk-in", mobile: inv.customerId.mobile }
        : { name: "Walk-in", mobile: null },
    }));

  return {
    upiId: qr.upiId,
    label: qr.label,
    provider: qr.provider,
    totalTransactions: allCount,
    totalAmount: allTotal,
    todayTransactions: todayCount,
    todayAmount: todayTotal,
    thisMonthTransactions: monthCount,
    thisMonthAmount: monthTotal,
    recentTransactions,
  };
};

export default { getPaymentQrStats };
