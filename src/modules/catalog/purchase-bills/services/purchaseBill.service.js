import ApiError from "../../../../utils/ApiError.js";
import purchaseBillRepository from "../repositories/purchaseBill.repository.js";
import gstLedgerRepository from "../../../finance/gst-ledger/repositories/gstLedger.repository.js";
import financialPeriodRepository from "../../../finance/financial-periods/repositories/financialPeriod.repository.js";
import Batch from "../../products/models/batch.model.js";
import ProductFacility from "../../products/models/productFacility.model.js";

const formatExpiry = (val) => {
  if (!val) return "";
  let str = String(val).trim();
  if (/^\d{2}\/\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}/${yy}`;
  }
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const mm = parts[1].padStart(2, "0");
    const yy = parts[2].length === 4 ? parts[2].slice(-2) : parts[2];
    return `${mm}/${yy}`;
  } else if (parts.length === 2) {
    const mm = parts[0].padStart(2, "0");
    const yy = parts[1].length === 4 ? parts[1].slice(-2) : parts[1];
    return `${mm}/${yy}`;
  }
  return str;
};

const createPurchaseBill = async (workspaceId, companyId, userId, payload) => {
  const {
    supplierId,
    branchId,
    purchaseBillNo,
    invoiceDate,
    rateBasis,
    items,
    extraDiscountPct,
    extraDiscountAmt,
    grossTotal,
    schemeDiscount,
    tradeDiscount,
    taxableSubtotal,
    taxableAfterExtraDisc,
    totalGst,
    grandTotal,
    amountPaid = 0,
    amountDue,
    gstSlabs,
  } = payload;

  if (!items || items.length === 0) {
    throw new ApiError(400, "Purchase bill must have at least one item");
  }

  if (!supplierId) {
    throw new ApiError(400, "Supplier is required");
  }

  const generatedBillNo = purchaseBillNo || `PB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Determine financial period based on invoice date
  let period = await financialPeriodRepository.findPeriodByDate(companyId, workspaceId, invoiceDate ? new Date(invoiceDate) : new Date());
  if (!period) {
    // Fallback: get the current open financial period
    const periods = await financialPeriodRepository.getPeriods(workspaceId, companyId, { isCurrent: true, all: true });
    period = periods.periods && periods.periods[0];
  }
  const financialPeriodId = period ? period._id : null;
  const bill = await purchaseBillRepository.createPurchaseBill({
    workspaceId,
    companyId,
    branchId: branchId || null,
    supplierId,
    purchaseBillNo: generatedBillNo,
    invoiceDate: invoiceDate || "",
    financialPeriodId,
    rateBasis: rateBasis || "PTS",
    items,
    extraDiscountPct: extraDiscountPct || 0,
    extraDiscountAmt: extraDiscountAmt || 0,
    grossTotal: grossTotal || 0,
    schemeDiscount: schemeDiscount || 0,
    tradeDiscount: tradeDiscount || 0,
    taxableSubtotal: taxableSubtotal || 0,
    taxableAfterExtraDisc: taxableAfterExtraDisc || 0,
    totalGst: totalGst || 0,
    grandTotal: grandTotal || 0,
    amountPaid: amountPaid || 0,
    amountDue: amountDue !== undefined ? amountDue : ((grandTotal || 0) - (amountPaid || 0)),
    status: "CONFIRMED",
    createdBy: userId,
  });

  try {
    const halfGst = (totalGst || 0) / 2;
    await gstLedgerRepository.createGstLedgerEntry({
      workspaceId,
      companyId,
      partyId: supplierId,
      voucherId: bill._id,
      voucherNumber: generatedBillNo,
      voucherDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      gstType: "GSTR-2",
      taxableAmount: taxableSubtotal || taxableAfterExtraDisc || 0,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalAmount: grandTotal || 0,
      narration: `Purchase Bill #${generatedBillNo}`,
    });
  } catch (err) {
    console.error("Failed to auto-create GSTR-2 entry for purchase bill:", err);
  }

  return bill;
};

const updatePurchaseBill = async (billId, workspaceId, companyId, userId, payload) => {
  const existingBill = await purchaseBillRepository.findPurchaseBillByIdAndWorkspace(
    billId,
    workspaceId,
    companyId
  );

  if (!existingBill) {
    throw new ApiError(404, "Purchase bill not found");
  }

  const {
    supplierId,
    branchId,
    purchaseBillNo,
    invoiceDate,
    rateBasis,
    items,
    extraDiscountPct,
    extraDiscountAmt,
    grossTotal,
    schemeDiscount,
    tradeDiscount,
    taxableSubtotal,
    taxableAfterExtraDisc,
    totalGst,
    grandTotal,
    amountPaid = 0,
    amountDue,
    gstSlabs,
  } = payload;

  if (!items || items.length === 0) {
    throw new ApiError(400, "Purchase bill must have at least one item");
  }

  if (!supplierId) {
    throw new ApiError(400, "Supplier is required");
  }

  // Determine financial period based on (updated) invoice date
  let period = await financialPeriodRepository.findPeriodByDate(companyId, workspaceId, invoiceDate ? new Date(invoiceDate) : new Date());
  if (!period) {
    const periods = await financialPeriodRepository.getPeriods(workspaceId, companyId, { isCurrent: true, all: true });
    period = periods.periods && periods.periods[0];
  }
  const financialPeriodId = period ? period._id : null;
  const updatedBill = await purchaseBillRepository.updatePurchaseBill(
    billId,
    workspaceId,
    companyId,
    {
      branchId: branchId || null,
      supplierId,
      purchaseBillNo: purchaseBillNo || existingBill.purchaseBillNo,
      invoiceDate: invoiceDate || "",
      financialPeriodId,
      rateBasis: rateBasis || "PTS",
      items,
      extraDiscountPct: extraDiscountPct || 0,
      extraDiscountAmt: extraDiscountAmt || 0,
      grossTotal: grossTotal || 0,
      schemeDiscount: schemeDiscount || 0,
      tradeDiscount: tradeDiscount || 0,
      taxableSubtotal: taxableSubtotal || 0,
      taxableAfterExtraDisc: taxableAfterExtraDisc || 0,
      totalGst: totalGst || 0,
      grandTotal: grandTotal || 0,
      amountPaid: amountPaid || 0,
      amountDue: amountDue !== undefined ? amountDue : ((grandTotal || 0) - (amountPaid || 0)),
      gstSlabs: gstSlabs || [],
    }
  );

  return updatedBill;
};

const getPurchaseBills = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, ...filters } = query;
  return purchaseBillRepository.getPurchaseBills(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort }
  );
};

const getPurchaseBillById = async (billId, companyId, workspaceId) => {
  const bill = await purchaseBillRepository.findPurchaseBillByIdAndWorkspace(
    billId,
    workspaceId,
    companyId
  );

  if (!bill) {
    throw new ApiError(404, "Purchase bill not found");
  }

  return bill;
};

const ingestPurchaseBill = async (billId, workspaceId, companyId, branchId) => {
  const bill = await purchaseBillRepository.findPurchaseBillByIdAndWorkspace(
    billId,
    workspaceId,
    companyId
  );

  if (!bill) {
    throw new ApiError(404, "Purchase bill not found");
  }

  if (bill.status === "RECEIVED") {
    throw new ApiError(400, "Purchase bill has already been ingested (RECEIVED).");
  }

  // Iterate over all items in the purchase bill
  for (const item of bill.items) {
    if (!item.productId) continue;

    const totalIngestQty = (Number(item.qty) || 0) + (Number(item.freeQty) || 0);
    if (totalIngestQty <= 0) continue;

    const formattedExpiry = formatExpiry(item.expiry);

    // 1. Update or Create Batch
    let batch = await Batch.findOne({
      workspaceId,
      product: item.productId,
      batchNo: item.batch,
      expiryDate: formattedExpiry,
    });

    if (batch) {
      batch.batchQty += totalIngestQty;
      // Update rates from the latest purchase bill
      batch.mrp = item.mrp || batch.mrp;
      batch.rate = item.rate || batch.rate;
      batch.schemeDiscountPercent = item.schPct || batch.schemeDiscountPercent;
      await batch.save();
    } else {
      batch = await Batch.create({
        workspaceId,
        branch_id: branchId || null,
        product: item.productId,
        batchNo: item.batch,
        expiryDate: formattedExpiry,
        batchQty: totalIngestQty,
        mrp: item.mrp || 0,
        rate: item.rate || 0,
        schemeDiscountPercent: item.schPct || 0,
        purchaseBillId: bill._id,
      });
    }

    // 2. Update or Create ProductFacility
    if (branchId) {
      let facility = await ProductFacility.findOne({
        workspaceId,
        facility_id: branchId,
        product_id: item.productId,
      });

      if (facility) {
        facility.total_qty_available += totalIngestQty;
        facility.qoh += totalIngestQty;
        facility.atp += totalIngestQty;
        await facility.save();
      } else {
        facility = await ProductFacility.create({
          workspaceId,
          facility_id: branchId,
          product_id: item.productId,
          total_qty_available: totalIngestQty,
          qoh: totalIngestQty,
          atp: totalIngestQty,
        });
      }
    }
  }

  // 3. Mark the Purchase Bill as RECEIVED
  const updatedBill = await purchaseBillRepository.updatePurchaseBill(
    billId,
    workspaceId,
    companyId,
    { status: "RECEIVED" }
  );

  return updatedBill;
};

const purchaseBillService = {
  createPurchaseBill,
  updatePurchaseBill,
  getPurchaseBills,
  getPurchaseBillById,
  ingestPurchaseBill,
};

export default purchaseBillService;
