import ApiError from "../../../../utils/ApiError.js";
import purchaseBillRepository from "../repositories/purchaseBill.repository.js";

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
    gstSlabs,
  } = payload;

  if (!items || items.length === 0) {
    throw new ApiError(400, "Purchase bill must have at least one item");
  }

  if (!supplierId) {
    throw new ApiError(400, "Supplier is required");
  }

  const generatedBillNo = purchaseBillNo || `PB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const bill = await purchaseBillRepository.createPurchaseBill({
    workspaceId,
    companyId,
    branchId: branchId || null,
    supplierId,
    purchaseBillNo: generatedBillNo,
    invoiceDate: invoiceDate || "",
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
    gstSlabs: gstSlabs || [],
    status: "CONFIRMED",
    createdBy: userId,
  });

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
    gstSlabs,
  } = payload;

  if (!items || items.length === 0) {
    throw new ApiError(400, "Purchase bill must have at least one item");
  }

  if (!supplierId) {
    throw new ApiError(400, "Supplier is required");
  }

  const updatedBill = await purchaseBillRepository.updatePurchaseBill(
    billId,
    workspaceId,
    companyId,
    {
      branchId: branchId || null,
      supplierId,
      purchaseBillNo: purchaseBillNo || existingBill.purchaseBillNo,
      invoiceDate: invoiceDate || "",
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

const purchaseBillService = {
  createPurchaseBill,
  updatePurchaseBill,
  getPurchaseBills,
  getPurchaseBillById,
};

export default purchaseBillService;
