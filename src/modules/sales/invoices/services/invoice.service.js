import ApiError from "../../../../utils/ApiError.js";
import invoiceRepository from "../repositories/invoice.repository.js";
import customerRepository from "../../../parties/customers/repositories/customer.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import financialPeriodRepository from "../../../finance/financial-periods/repositories/financialPeriod.repository.js";
import Batch from "../../../catalog/products/models/batch.model.js";
import ProductFacility from "../../../catalog/products/models/productFacility.model.js";
import gstLedgerRepository from "../../../finance/gst-ledger/repositories/gstLedger.repository.js";

const recordCustomerSale = async (customerId, saleData, companyId, workspaceId, user = null) => {
  const customer = await customerRepository.findCustomerById(customerId, companyId, workspaceId);

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  let resolvedBranchId = saleData.branchId || null;
  if (!resolvedBranchId) {
    try {
      const activeBranches = await branchRepository.findActiveBranchesByCompany(companyId);
      if (Array.isArray(activeBranches) && activeBranches.length > 0) {
        resolvedBranchId = activeBranches[0]._id;
      }
    } catch (bErr) {
      // Fallback
    }
  }

  let period = await financialPeriodRepository.findPeriodByDate(companyId, workspaceId, saleData.date ? new Date(saleData.date) : new Date());
  if (!period) {
    const periods = await financialPeriodRepository.getPeriods(workspaceId, companyId, { isCurrent: true, all: true });
    period = periods.periods && periods.periods[0];
  }
  const financialPeriodId = period ? period._id : null;

  const newSale = {
    workspaceId: workspaceId || customer.workspaceId,
    companyId: companyId || customer.companyId,
    branchId: resolvedBranchId,
    customerId: customer._id,
    invoiceNo: saleData.invoiceNo || `RET-INV-${Date.now()}`,
    date: saleData.date || new Date(),
    financialPeriodId,
    billingMode: saleData.billingMode || "B2C",
    subtotal: saleData.subtotal || 0,
    discount: saleData.discount || 0,
    tax: saleData.tax || 0,
    grandTotal: saleData.grandTotal || 0,
    cashTendered: saleData.cashTendered || 0,
    changeDue: saleData.changeDue || 0,
    paymentMethod: saleData.paymentMethod || "Cash",
    status: saleData.status || "Paid",
    items: Array.isArray(saleData.items) ? saleData.items : [],
    doctor: saleData.doctor || null,
    notes: saleData.notes || null,
    createdBy: user?._id || null,
    createdByName: user?.name || null,
    createdByEmail: user?.email || null,
  };

  const savedInvoice = await invoiceRepository.createInvoice(newSale);

  // Deduct inventory from Batch and ProductFacility
  if (Array.isArray(newSale.items) && newSale.items.length > 0) {
    for (const item of newSale.items) {
      const qtyToDeduct = Number(item.qty) || 0;
      if (qtyToDeduct <= 0) continue;

      const productId = item.productId || item.workspaceProductId || item.id;
      const batchId = item.batchId || (item.batch && item.batch._id) || item.batch;

      if (batchId) {
        try {
          const batchDoc = await Batch.findById(batchId);
          if (batchDoc) {
            batchDoc.batchQty = Math.max(0, (batchDoc.batchQty || 0) - qtyToDeduct);
            await batchDoc.save();
          }
        } catch (err) {
          console.error("Error deducting batch stock for sale:", err);
        }
      }

      if (productId && resolvedBranchId) {
        try {
          const facilityDoc = await ProductFacility.findOne({
            product_id: productId,
            facility_id: resolvedBranchId
          });
          if (facilityDoc) {
            facilityDoc.total_qty_available = Math.max(0, (facilityDoc.total_qty_available || 0) - qtyToDeduct);
            facilityDoc.qoh = Math.max(0, (facilityDoc.qoh || 0) - qtyToDeduct);
            facilityDoc.atp = Math.max(0, (facilityDoc.atp || 0) - qtyToDeduct);
            await facilityDoc.save();
          }
        } catch (err) {
          console.error("Error deducting product facility stock for sale:", err);
        }
      }
    }
  }

  // Auto-create GSTR-1 Entry for GST Ledger
  try {
    const totalGst = Number(newSale.tax || saleData.tax || 0);
    const halfGst = totalGst / 2;
    const taxableAmt = Number(
      saleData.taxableAmount !== undefined
        ? saleData.taxableAmount
        : (newSale.subtotal || 0) - (newSale.discount || 0)
    );

    await gstLedgerRepository.createGstLedgerEntry({
      workspaceId: newSale.workspaceId,
      companyId: newSale.companyId,
      partyId: customer._id,
      voucherId: savedInvoice._id,
      voucherNumber: newSale.invoiceNo,
      voucherDate: newSale.date ? new Date(newSale.date) : new Date(),
      gstType: "GSTR-1",
      taxableAmount: taxableAmt,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalAmount: Number(newSale.grandTotal || 0),
      narration: `Sale Bill ${newSale.invoiceNo} (${newSale.billingMode}) - Customer: ${customer.name || "Customer"}`,
    });
  } catch (gstErr) {
    console.error("Failed to auto-create GSTR-1 entry for sale bill:", gstErr);
  }

  return savedInvoice;
};

const getCustomerSales = async (customerId, companyId, workspaceId, branchId = null, pagination = {}) => {
  const customer = await customerRepository.findCustomerByIdCompanyAndWorkspace(
    customerId,
    companyId,
    workspaceId
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const result = await invoiceRepository.getInvoicesByCustomerId(
    customerId,
    companyId,
    workspaceId,
    { branchId },
    pagination
  );

  return {
    data: result.sales,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  };
};

const getAllCustomerSales = async (companyId, workspaceId, branchId = null, pagination = {}) => {
  const result = await invoiceRepository.getAllInvoices(
    companyId,
    workspaceId,
    { branchId },
    pagination
  );

  return {
    data: result.sales,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  };
};

export default {
  recordCustomerSale,
  getCustomerSales,
  getAllCustomerSales,
};
