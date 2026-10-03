import mongoose from "mongoose";
import SalesInvoice from "../../sales/invoices/models/invoice.model.js";
import WorkspaceProduct from "../../catalog/products/models/workspaceProduct.model.js";
import Batch from "../../catalog/products/models/batch.model.js";
import ProductFacility from "../../catalog/products/models/productFacility.model.js";
import PurchaseBill from "../../catalog/purchase-bills/models/purchaseBill.model.js";
import { Shift } from "../../operations/shifts/shift.model.js";
import Customer from "../../parties/customers/models/customer.model.js";
import Supplier from "../../parties/suppliers/models/supplier.model.js";

/**
 * Parse an expiry string like "MM/YY", "MM/YYYY", "YYYY-MM", or "YYYY-MM-DD"
 * into a Date object representing the last millisecond of that expiry month/day.
 */
const parseExpiryDate = (str) => {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();

  // Pattern MM/YY or MM/YYYY
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 2) {
      const month = parseInt(parts[0], 10);
      let year = parseInt(parts[1], 10);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12) {
        // Expiry is end of that month
        return new Date(year, month, 0, 23, 59, 59, 999);
      }
    }
  }

  // Pattern YYYY-MM or YYYY-MM-DD
  if (trimmed.includes("-")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return null;
};

const getDashboardOverview = async ({ workspaceId, companyId, branchId = null }) => {
  const wsObjectId = new mongoose.Types.ObjectId(workspaceId);
  const compObjectId = new mongoose.Types.ObjectId(companyId);
  const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : null;

  // Base scope filters
  const invoiceBaseFilter = {
    workspaceId: wsObjectId,
    companyId: compObjectId,
    isDeleted: false,
  };
  if (branchObjectId) {
    invoiceBaseFilter.branchId = branchObjectId;
  }

  const purchaseBillBaseFilter = {
    workspaceId: wsObjectId,
    companyId: compObjectId,
    isDeleted: false,
  };

  const batchBaseFilter = {
    workspaceId: wsObjectId,
    isDeleted: false,
  };

  const productFacilityBaseFilter = {
    workspaceId: wsObjectId,
    isDeleted: false,
  };
  if (branchObjectId) {
    productFacilityBaseFilter.facility_id = branchObjectId;
  }

  // Time boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  // 1. Sales Aggregations (Today, This Month, Last Month, All Time)
  const salesAggPromise = SalesInvoice.aggregate([
    { $match: invoiceBaseFilter },
    {
      $facet: {
        today: [
          { $match: { date: { $gte: startOfToday, $lte: endOfToday } } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$grandTotal" },
              count: { $sum: 1 },
              tax: { $sum: "$tax" },
            },
          },
        ],
        thisMonth: [
          { $match: { date: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$grandTotal" },
              count: { $sum: 1 },
              tax: { $sum: "$tax" },
            },
          },
        ],
        lastMonth: [
          { $match: { date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ],
        allTime: [
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ],
        monthlyHistory: [
          { $match: { date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$date" },
                month: { $month: "$date" },
              },
              revenue: { $sum: "$grandTotal" },
              tax: { $sum: "$tax" },
              invoicesCount: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  // 2. Purchase Bills Aggregation (Monthly Expenses)
  const purchasesAggPromise = PurchaseBill.aggregate([
    { $match: purchaseBillBaseFilter },
    {
      $facet: {
        thisMonth: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalExpenses: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ],
        allTime: [
          {
            $group: {
              _id: null,
              totalExpenses: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ],
        monthlyHistory: [
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              expenses: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  // 3. Inventory Stock & Batches
  const activeProductsCountPromise = WorkspaceProduct.countDocuments({
    workspaceId: wsObjectId,
    isDeleted: false,
    status: { $regex: /^active$/i },
  });

  const batchesPromise = Batch.find(batchBaseFilter)
    .populate("product", "name workspaceProductCode productType category")
    .sort({ createdAt: -1 })
    .lean();

  // 4. Products Distribution by Category / Product Type
  const categoryDistributionPromise = WorkspaceProduct.aggregate([
    { $match: { workspaceId: wsObjectId, isDeleted: false, status: { $regex: /^active$/i } } },
    {
      $lookup: {
        from: "categorymasters",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    {
      $project: {
        categoryName: {
          $ifNull: [
            { $arrayElemAt: ["$categoryDoc.name", 0] },
            { $toUpper: "$productType" },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$categoryName",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // 5. Recent 5 Sales Invoices
  const recentInvoicesPromise = SalesInvoice.find(invoiceBaseFilter)
    .populate("customerId", "name mobile")
    .sort({ date: -1 })
    .limit(5)
    .lean();

  // 6. Recent 5 Purchase Bills
  const recentPurchasesPromise = PurchaseBill.find(purchaseBillBaseFilter)
    .populate("supplierId", "businessName")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // 7. Active Shift status (if branch provided)
  const activeShiftPromise = branchObjectId
    ? Shift.findOne({ branchId: branchObjectId, status: "OPEN" }).lean()
    : null;

  // Execute all concurrent queries
  const [
    salesAggResult,
    purchasesAggResult,
    totalActiveProducts,
    allBatches,
    categoryDistResult,
    recentInvoices,
    recentPurchases,
    activeShift,
  ] = await Promise.all([
    salesAggPromise,
    purchasesAggPromise,
    activeProductsCountPromise,
    batchesPromise,
    categoryDistributionPromise,
    recentInvoicesPromise,
    recentPurchasesPromise,
    activeShiftPromise,
  ]);

  // Process Sales Facet Data
  const salesFacets = salesAggResult[0] || {};
  const todaySales = salesFacets.today?.[0] || { totalAmount: 0, count: 0, tax: 0 };
  const thisMonthSales = salesFacets.thisMonth?.[0] || { totalAmount: 0, count: 0, tax: 0 };
  const lastMonthSales = salesFacets.lastMonth?.[0] || { totalAmount: 0, count: 0 };
  const allTimeSales = salesFacets.allTime?.[0] || { totalAmount: 0, count: 0 };
  const monthlySalesHistory = salesFacets.monthlyHistory || [];

  // Process Purchases Facet Data
  const purchaseFacets = purchasesAggResult[0] || {};
  const thisMonthPurchases = purchaseFacets.thisMonth?.[0] || { totalExpenses: 0, count: 0 };
  const allTimePurchases = purchaseFacets.allTime?.[0] || { totalExpenses: 0, count: 0 };
  const monthlyPurchasesHistory = purchaseFacets.monthlyHistory || [];

  // Month-over-month revenue trend calculation
  let revenueTrendPercent = 0;
  if (lastMonthSales.totalAmount > 0) {
    revenueTrendPercent = Number(
      (((thisMonthSales.totalAmount - lastMonthSales.totalAmount) / lastMonthSales.totalAmount) * 100).toFixed(1)
    );
  }

  // Process Batches for:
  // - Total Units in Stock
  // - Low Stock Batches (qty <= 10)
  // - Expiring Soon Batches (expiry <= 30 days from now)
  let totalStockUnits = 0;
  const lowStockList = [];
  const expiringSoonList = [];

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  for (const b of allBatches) {
    const qty = Number(b.batchQty || 0);
    totalStockUnits += qty;

    const productName = b.product?.name || "Product";
    const productSku = b.product?.workspaceProductCode || "SKU";
    const productType = b.product?.productType || "Medicine";

    // Low stock check
    if (qty <= 10) {
      lowStockList.push({
        id: b._id.toString(),
        productId: b.product?._id?.toString(),
        name: productName,
        sku: productSku,
        form: productType,
        batch: b.batchNo,
        remaining: qty,
      });
    }

    // Expiry check
    const expDate = parseExpiryDate(b.expiryDate);
    if (expDate) {
      const diffMs = expDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft <= 30) {
        expiringSoonList.push({
          id: b._id.toString(),
          productId: b.product?._id?.toString(),
          name: productName,
          sku: productSku,
          batch: b.batchNo,
          daysLeft: daysLeft < 0 ? 0 : daysLeft,
          isExpired: daysLeft <= 0,
          rawExpiry: b.expiryDate,
          count: qty,
        });
      }
    }
  }

  // Sort expiring soon by urgency
  expiringSoonList.sort((a, b) => a.daysLeft - b.daysLeft);
  lowStockList.sort((a, b) => a.remaining - b.remaining);

  // Build unified 6-Month Points Array
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartPoints = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-12
    const mLabel = monthNames[d.getMonth()];

    const salesMatch = monthlySalesHistory.find(
      (item) => item._id.year === y && item._id.month === m
    );
    const purchaseMatch = monthlyPurchasesHistory.find(
      (item) => item._id.year === y && item._id.month === m
    );

    const rev = salesMatch ? Math.round(salesMatch.revenue) : 0;
    const exp = purchaseMatch ? Math.round(purchaseMatch.expenses) : 0;
    const profit = rev - exp;
    const invCount = salesMatch ? salesMatch.invoicesCount : 0;

    chartPoints.push({
      month: mLabel,
      year: y,
      revenue: rev,
      expenses: exp,
      profit: profit > 0 ? profit : 0,
      invoices: invCount,
    });
  }

  // Category Distribution formatting
  const colorVars = [
    "var(--app-color-primary)",
    "var(--app-color-success)",
    "var(--app-color-warning)",
    "var(--app-color-info)",
    "var(--app-color-error)",
  ];
  const bgClasses = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-info",
    "bg-error",
  ];

  const totalCategorized = categoryDistResult.reduce((sum, item) => sum + item.count, 0);
  const categoriesFormatted = categoryDistResult.slice(0, 5).map((item, idx) => ({
    name: item._id || "Other",
    count: item.count,
    percentage: totalCategorized > 0 ? Math.round((item.count / totalCategorized) * 100) : 0,
    colorVar: colorVars[idx % colorVars.length],
    bgClass: bgClasses[idx % bgClasses.length],
  }));

  // Build Live Operational Alerts (Deterministic Real Data)
  const liveAlerts = [];
  if (lowStockList.length > 0) {
    liveAlerts.push({
      id: "alert-low-stock",
      text: `${lowStockList.length} medicine batch${lowStockList.length > 1 ? "es" : ""} running critically low on stock (<= 10 units).`,
      intent: "warning",
      iconName: "Package",
    });
  }
  if (expiringSoonList.length > 0) {
    liveAlerts.push({
      id: "alert-expiring",
      text: `${expiringSoonList.length} batch${expiringSoonList.length > 1 ? "es" : ""} expiring within the next 30 days.`,
      intent: "error",
      iconName: "CalendarDays",
    });
  }
  if (todaySales.count > 0) {
    liveAlerts.push({
      id: "alert-today-sales",
      text: `Today's revenue reached ₹${todaySales.totalAmount.toLocaleString()} across ${todaySales.count} completed transaction${todaySales.count > 1 ? "s" : ""}.`,
      intent: "success",
      iconName: "TrendingUp",
    });
  } else if (allTimeSales.count > 0) {
    liveAlerts.push({
      id: "alert-total-sales",
      text: `Total sales recorded: ₹${allTimeSales.totalAmount.toLocaleString()} across ${allTimeSales.count} completed transaction${allTimeSales.count > 1 ? "s" : ""}.`,
      intent: "success",
      iconName: "TrendingUp",
    });
  } else {
    liveAlerts.push({
      id: "alert-no-sales",
      text: "No sales recorded yet. Billing terminal is open and ready.",
      intent: "primary",
      iconName: "ShoppingCart",
    });
  }

  if (allTimePurchases.count > 0) {
    liveAlerts.push({
      id: "alert-purchases",
      text: `Total purchases: ₹${allTimePurchases.totalExpenses.toLocaleString()} recorded across ${allTimePurchases.count} purchase bill${allTimePurchases.count > 1 ? "s" : ""}.`,
      intent: "info",
      iconName: "Package",
    });
  }

  if (activeShift) {
    liveAlerts.push({
      id: "alert-shift-open",
      text: `Cashier shift #${activeShift.shiftNo || 1} is currently active and open for transactions.`,
      intent: "info",
      iconName: "ShieldCheck",
    });
  }

  const effectiveTodaysSales = todaySales.totalAmount > 0 ? todaySales.totalAmount : (allTimeSales.totalAmount || 0);
  const effectiveTransactionsToday = todaySales.count > 0 ? todaySales.count : (allTimeSales.count || 0);

  return {
    kpis: {
      totalRevenue: allTimeSales.totalAmount || 0,
      totalInvoicesCount: allTimeSales.count || 0,
      totalPurchases: allTimePurchases.totalExpenses || 0,
      totalPurchasesCount: allTimePurchases.count || 0,
      thisMonthRevenue: (thisMonthSales.totalAmount || allTimeSales.totalAmount) || 0,
      thisMonthPurchases: (thisMonthPurchases.totalExpenses || allTimePurchases.totalExpenses) || 0,
      revenueTrendPercent,
      medicinesInStock: totalActiveProducts || 0,
      totalStockUnits: totalStockUnits || 0,
      lowStockAlertsCount: lowStockList.length,
      expiringSoonCount: expiringSoonList.length,
      todaysSalesAmount: effectiveTodaysSales,
      transactionsToday: effectiveTransactionsToday,
      taxCollectedThisMonth: (thisMonthSales.tax || allTimeSales.tax) || 0,
    },
    monthlyFinancials: {
      revenue: (thisMonthSales.totalAmount || allTimeSales.totalAmount) || 0,
      expenses: (thisMonthPurchases.totalExpenses || allTimePurchases.totalExpenses) || 0,
      profit: Math.max(
        0,
        ((thisMonthSales.totalAmount || allTimeSales.totalAmount) || 0) -
          ((thisMonthPurchases.totalExpenses || allTimePurchases.totalExpenses) || 0)
      ),
      invoicesCount: (thisMonthSales.count || allTimeSales.count) || 0,
      chartPoints,
    },
    inventoryDistribution: {
      totalProducts: totalActiveProducts,
      categories: categoriesFormatted,
    },
    lowStockItems: lowStockList.slice(0, 5),
    expiringBatches: expiringSoonList.slice(0, 5),
    recentTransactions: recentInvoices.map((inv) => ({
      id: inv._id.toString(),
      invoiceNo: inv.invoiceNo,
      customerName: inv.customerId?.name || "Walk-in Customer",
      customerMobile: inv.customerId?.mobile || null,
      amount: inv.grandTotal,
      paymentMethod: inv.paymentMethod,
      date: inv.date,
      status: inv.status,
    })),
    recentPurchaseBills: recentPurchases.map((pb) => ({
      id: pb._id.toString(),
      billNo: pb.purchaseBillNo || "PB-N/A",
      supplierName: pb.supplierId?.businessName || "Supplier",
      amount: pb.grandTotal,
      amountDue: pb.amountDue,
      status: pb.status,
      date: pb.createdAt,
    })),
    liveAlerts,
    shift: activeShift ? { isOpen: true, shiftNo: activeShift.shiftNo } : { isOpen: false },
  };
};

export default {
  getDashboardOverview,
};
