import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import purchaseReturnRepository from "../repositories/purchaseReturn.repository.js";
import purchaseBillRepository from "../../purchase-bills/repositories/purchaseBill.repository.js";
import PurchaseBill from "../../purchase-bills/models/purchaseBill.model.js";
import Batch from "../../products/models/batch.model.js";
import ProductFacility from "../../products/models/productFacility.model.js";
import WorkspaceProduct from "../../products/models/workspaceProduct.model.js";
import Supplier from "../../../parties/suppliers/models/supplier.model.js";
import Company from "../../../organization/companies/models/company.model.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import gstLedgerRepository from "../../../finance/gst-ledger/repositories/gstLedger.repository.js";
import financialPeriodRepository from "../../../finance/financial-periods/repositories/financialPeriod.repository.js";
import journalVoucherService from "../../../finance/journal-vouchers/services/journalVoucher.service.js";
import Account from "../../../finance/chart-of-accounts/models/account.model.js";
import { VOUCHER_TYPE } from "../../../finance/journal-vouchers/constants/voucherType.constant.js";
import { VOUCHER_STATUS } from "../../../finance/journal-vouchers/constants/voucherStatus.constant.js";
import {
  PURCHASE_RETURN_STATUS,
  RETURN_MOTIVE,
  SETTLEMENT_TYPE,
  SETTLEMENT_STATUS,
} from "../constants/purchaseReturn.constant.js";

/**
 * Format expiry MM/YY
 */
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
  return str;
};

/**
 * Search and resolve batches in branch with FIFO purchase rate lookup
 */
const getEligibleBatchesForReturn = async (
  workspaceId,
  companyId,
  branchId,
  options = {}
) => {
  const { supplierId, search, sourceBin = "ALL", limit = 50 } = options;

  let resolvedBranchId = branchId;
  if (!resolvedBranchId) {
    const defaultBranch = await branchRepository.getDefaultBranch(workspaceId);
    resolvedBranchId = defaultBranch?._id || null;
  }

  // 1. Build Batch query
  const batchQuery = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    isDeleted: false,
  };

  if (resolvedBranchId) {
    batchQuery.branch_id = new mongoose.Types.ObjectId(resolvedBranchId);
  }

  if (sourceBin === "SCRAP" || sourceBin === "EXPIRED" || sourceBin === "BROKEN") {
    batchQuery.scrapQty = { $gt: 0 };
    if (sourceBin === "EXPIRED") batchQuery.expiredQty = { $gt: 0 };
    if (sourceBin === "BROKEN") batchQuery.brokenQty = { $gt: 0 };
  } else if (sourceBin === "SELLABLE") {
    batchQuery.batchQty = { $gt: 0 };
  } else {
    // ALL: either sellable or scrap stock > 0
    batchQuery.$or = [{ batchQty: { $gt: 0 } }, { scrapQty: { $gt: 0 } }];
  }

  if (search) {
    batchQuery.batchNo = { $regex: search.trim(), $options: "i" };
  }

  const batches = await Batch.find(batchQuery)
    .populate({
      path: "product",
      select: "name itemCode pack hsn hsnTaxpercent mrp pts ptr",
    })
    .limit(Number(limit))
    .lean();

  // 2. Enrich with Purchase Bill Inflow history and unreturned quotas
  const enrichedBatches = await Promise.all(
    batches.map(async (batch) => {
      const product = batch.product || {};
      const productId = product._id || batch.product;

      // Find matching purchase bills for this product & batch
      const billFilter = {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        isDeleted: false,
      };

      if (supplierId) {
        billFilter.supplierId = new mongoose.Types.ObjectId(supplierId);
      }

      if (batch.purchaseBillId) {
        billFilter.$or = [
          { _id: new mongoose.Types.ObjectId(batch.purchaseBillId) },
          { "items.productId": productId, "items.batch": batch.batchNo },
        ];
      } else {
        billFilter["items.productId"] = productId;
        billFilter["items.batch"] = batch.batchNo;
      }

      let matchingBills = await PurchaseBill.find(billFilter)
        .populate("supplierId", "businessName name gstNumber mobile phone email address")
        .sort({ invoiceDate: -1, createdAt: -1 })
        .limit(5)
        .lean();

      // Fallback: If no bill matched by batch number, find any purchase bill for this product
      if (matchingBills.length === 0 && !supplierId) {
        const productBills = await PurchaseBill.find({
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          isDeleted: false,
          "items.productId": productId,
        })
          .populate("supplierId", "businessName name gstNumber mobile phone email address")
          .sort({ invoiceDate: -1, createdAt: -1 })
          .limit(1)
          .lean();
        if (productBills.length > 0) {
          matchingBills = productBills;
        }
      }

      // Find the best inflow item
      let inflowBill = null;
      let inflowItem = null;

      if (matchingBills.length > 0) {
        // If batch has a specific purchaseBillId, prioritize it
        if (batch.purchaseBillId) {
          inflowBill = matchingBills.find(
            (b) => String(b._id) === String(batch.purchaseBillId)
          );
        }
        if (!inflowBill) {
          inflowBill = matchingBills[0];
        }

        if (inflowBill) {
          inflowItem =
            inflowBill.items.find(
              (i) =>
                String(i.productId) === String(productId) &&
                i.batch === batch.batchNo
            ) ||
            inflowBill.items.find(
              (i) => String(i.productId) === String(productId)
            ) ||
            inflowBill.items[0];
        }
      }

      const billedQty = Number(inflowItem?.qty || 0);
      const freeQty = Number(inflowItem?.freeQty || 0);
      const totalInflowQty = billedQty + freeQty;
      const taxableAmount = Number(inflowItem?.amount || 0);
      const effectiveRate =
        totalInflowQty > 0
          ? Number((taxableAmount / totalInflowQty).toFixed(2))
          : Number(batch.rate || product.pts || 0);

      const gstPct = Number(
        inflowItem?.gst || product.hsnTaxpercent || 0
      );

      // Compute already returned qty for this bill & batch
      let alreadyReturnedQty = 0;
      if (inflowBill) {
        const previousReturns = await purchaseReturnRepository.getReturnsForBill(
          inflowBill._id,
          workspaceId
        );
        for (const pr of previousReturns) {
          for (const item of pr.items || []) {
            if (
              String(item.batchId) === String(batch._id) ||
              (String(item.productId) === String(productId) &&
                item.batchNo === batch.batchNo)
            ) {
              alreadyReturnedQty += Number(item.returnQty || 0);
            }
          }
        }
      }

      const unreturnedBillQuota =
        totalInflowQty > 0 ? Math.max(0, totalInflowQty - alreadyReturnedQty) : 999999;

      const availableShelfStock = Math.max(
        0,
        (batch.batchQty || 0) - (batch.totalReservedBatchQty || 0)
      );
      const availableScrapStock = batch.scrapQty || 0;
      const expiredStock = batch.expiredQty || 0;
      const brokenStock = batch.brokenQty || 0;

      return {
        batchId: batch._id,
        productId,
        productName: product.name || "Unknown Product",
        itemCode: product.itemCode || "",
        pack: product.pack || "",
        batchNo: batch.batchNo,
        expiry: batch.expiryDate || "",
        mrp: batch.mrp || product.mrp || 0,
        rate: effectiveRate,
        gstPct,
        availableShelfStock,
        availableScrapStock,
        expiredStock,
        brokenStock,
        unreturnedBillQuota,
        supplier: inflowBill?.supplierId || null,
        supplierId: inflowBill?.supplierId?._id || null,
        supplierName: inflowBill?.supplierId?.businessName || inflowBill?.supplierId?.name || "",
        purchaseBillId: inflowBill?._id || null,
        purchaseBillNo: inflowBill?.purchaseBillNo || "",
        purchaseBillDate: inflowBill?.invoiceDate || "",
      };
    })
  );

  return enrichedBatches;
};

/**
 * Create a new Purchase Return & issue Debit Note (Atomic Transaction)
 */
const createPurchaseReturn = async (
  workspaceId,
  companyId,
  branchId,
  userId,
  payload
) => {
  const {
    supplierId,
    returnDate,
    returnMotive = RETURN_MOTIVE.SELLABLE,
    settlementType = SETTLEMENT_TYPE.DEBIT_NOTE,
    items,
    adjustedPurchaseBillId = null,
    reason = "",
    remarks = "",
  } = payload;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Purchase return must contain at least one item");
  }

  if (!supplierId) {
    throw new ApiError(400, "Supplier is required");
  }

  // 1. Resolve Branch
  let resolvedBranchId = branchId;
  let branchCode = "BR01";
  if (!resolvedBranchId) {
    try {
      const activeBranches = await branchRepository.getCompanyBranches(companyId);
      if (Array.isArray(activeBranches) && activeBranches.length > 0) {
        resolvedBranchId = activeBranches[0]._id;
        branchCode = activeBranches[0].branchCode || branchCode;
      }
    } catch (bErr) {}
  } else {
    try {
      const branchDoc = await branchRepository.findBranchById(resolvedBranchId);
      if (branchDoc && branchDoc.branchCode) {
        branchCode = branchDoc.branchCode;
      }
    } catch (bErr) {}
  }

  if (!resolvedBranchId) {
    throw new ApiError(400, "Active branch facility is required");
  }

  // 2. Fetch Supplier & Company for GST & Financial Ledger details
  const [supplier, company] = await Promise.all([
    Supplier.findOne({ _id: supplierId, workspaceId }),
    Company.findOne({ _id: companyId, workspaceId }),
  ]);

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const companyGstin = (company?.gstin || "").trim().toUpperCase();
  const supplierGstin = (supplier?.gstNumber || "").trim().toUpperCase();
  const isIgst =
    companyGstin &&
    supplierGstin &&
    companyGstin.substring(0, 2) !== supplierGstin.substring(0, 2);

  // 3. Process line items & calculate taxes
  let taxableSubtotal = 0;
  let totalGst = 0;
  const slabMap = new Map();

  const processedItems = [];

  for (const item of items) {
    const {
      productId,
      productName,
      pack,
      batchId,
      batchNo,
      expiry,
      purchaseBillId,
      purchaseBillNo,
      purchaseBillDate,
      sourceBin = "SELLABLE",
      returnQty,
      rate,
      discountPct = 0,
      gstPct = 0,
    } = item;

    const qty = Number(returnQty);
    if (isNaN(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid return quantity for batch ${batchNo}`);
    }

    const itemRate = Number(rate || 0);
    const disc = Number(discountPct || 0);
    const lineGross = qty * itemRate;
    const lineDiscount = lineGross * (disc / 100);
    const lineTaxable = Number((lineGross - lineDiscount).toFixed(2));

    const taxRate = Number(gstPct || 0);
    const lineTax = Number(((lineTaxable * taxRate) / 100).toFixed(2));
    const halfTax = Number((lineTax / 2).toFixed(2));

    const cgstAmt = isIgst ? 0 : halfTax;
    const sgstAmt = isIgst ? 0 : Number((lineTax - halfTax).toFixed(2));
    const igstAmt = isIgst ? lineTax : 0;
    const lineTotal = Number((lineTaxable + lineTax).toFixed(2));

    taxableSubtotal += lineTaxable;
    totalGst += lineTax;

    // Aggregate slab
    if (!slabMap.has(taxRate)) {
      slabMap.set(taxRate, {
        gstPct: taxRate,
        taxable: 0,
        cgstAmt: 0,
        sgstAmt: 0,
        igstAmt: 0,
        totalTax: 0,
      });
    }
    const slab = slabMap.get(taxRate);
    slab.taxable += lineTaxable;
    slab.cgstAmt += cgstAmt;
    slab.sgstAmt += sgstAmt;
    slab.igstAmt += igstAmt;
    slab.totalTax += lineTax;

    processedItems.push({
      productId,
      productName: productName || "",
      pack: pack || "",
      batchId,
      batchNo,
      expiry: formatExpiry(expiry),
      purchaseBillId: purchaseBillId || null,
      purchaseBillNo: purchaseBillNo || "",
      purchaseBillDate: purchaseBillDate || "",
      sourceBin,
      returnQty: qty,
      rate: itemRate,
      discountPct: disc,
      taxableAmount: lineTaxable,
      gstPct: taxRate,
      cgstAmt,
      sgstAmt,
      igstAmt,
      totalGst: lineTax,
      totalAmount: lineTotal,
    });
  }

  taxableSubtotal = Number(taxableSubtotal.toFixed(2));
  totalGst = Number(totalGst.toFixed(2));
  const rawGrandTotal = taxableSubtotal + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  const gstSlabs = Array.from(slabMap.values()).map((s) => ({
    gstPct: s.gstPct,
    taxable: Number(s.taxable.toFixed(2)),
    cgstAmt: Number(s.cgstAmt.toFixed(2)),
    sgstAmt: Number(s.sgstAmt.toFixed(2)),
    igstAmt: Number(s.igstAmt.toFixed(2)),
    totalTax: Number(s.totalTax.toFixed(2)),
  }));

  // 4. Generate Numbers
  const [returnNo, debitNoteNo] = await Promise.all([
    purchaseReturnRepository.generateNextReturnNo(
      companyId,
      workspaceId,
      branchCode
    ),
    purchaseReturnRepository.generateNextDebitNoteNo(
      companyId,
      workspaceId,
      branchCode
    ),
  ]);

  // 5. Determine Financial Period
  let period = await financialPeriodRepository.findPeriodByDate(
    companyId,
    workspaceId,
    returnDate ? new Date(returnDate) : new Date()
  );
  if (!period) {
    const periods = await financialPeriodRepository.getPeriods(
      workspaceId,
      companyId,
      { isCurrent: true, all: true }
    );
    period = periods.periods && periods.periods[0];
  }
  const financialPeriodId = period ? period._id : null;

  // 6. Begin ACID Transaction Session
  const session = await mongoose.startSession();
  session.startTransaction();

  let createdReturn = null;

  try {
    // A. Decrement Stock for each item
    for (const item of processedItems) {
      const batchDoc = await Batch.findById(item.batchId).session(session);
      if (!batchDoc) {
        throw new ApiError(404, `Batch ${item.batchNo} not found`);
      }

      if (item.sourceBin === "SELLABLE") {
        if (batchDoc.batchQty < item.returnQty) {
          throw new ApiError(
            400,
            `Insufficient shelf stock for batch ${item.batchNo}. Available: ${batchDoc.batchQty}, Requested: ${item.returnQty}`
          );
        }
        await Batch.updateOne(
          { _id: item.batchId },
          { $inc: { batchQty: -item.returnQty } },
          { session }
        );

        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: resolvedBranchId,
            product_id: item.productId,
          },
          {
            $inc: {
              total_qty_available: -item.returnQty,
              qoh: -item.returnQty,
              atp: -item.returnQty,
            },
          },
          { session }
        );
      } else if (item.sourceBin === "SCRAP_EXPIRED") {
        if (batchDoc.expiredQty < item.returnQty) {
          throw new ApiError(
            400,
            `Insufficient expired scrap stock for batch ${item.batchNo}. Available: ${batchDoc.expiredQty}`
          );
        }
        await Batch.updateOne(
          { _id: item.batchId },
          {
            $inc: {
              expiredQty: -item.returnQty,
              scrapQty: -item.returnQty,
            },
          },
          { session }
        );

        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: resolvedBranchId,
            product_id: item.productId,
          },
          {
            $inc: {
              expiredQty: -item.returnQty,
              scrapQty: -item.returnQty,
            },
          },
          { session }
        );
      } else if (item.sourceBin === "SCRAP_BROKEN") {
        if (batchDoc.brokenQty < item.returnQty) {
          throw new ApiError(
            400,
            `Insufficient broken scrap stock for batch ${item.batchNo}. Available: ${batchDoc.brokenQty}`
          );
        }
        await Batch.updateOne(
          { _id: item.batchId },
          {
            $inc: {
              brokenQty: -item.returnQty,
              scrapQty: -item.returnQty,
            },
          },
          { session }
        );

        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: resolvedBranchId,
            product_id: item.productId,
          },
          {
            $inc: {
              brokenQty: -item.returnQty,
              scrapQty: -item.returnQty,
            },
          },
          { session }
        );
      }
    }

    // B. Save PurchaseReturn Document
    const returnData = {
      workspaceId,
      companyId,
      branchId: resolvedBranchId,
      supplierId,
      returnNo,
      debitNoteNo,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      returnMotive,
      settlementType,
      settlementStatus: adjustedPurchaseBillId
        ? SETTLEMENT_STATUS.ADJUSTED_IN_BILL
        : SETTLEMENT_STATUS.PENDING,
      settledAmount: adjustedPurchaseBillId ? grandTotal : 0,
      adjustedPurchaseBillId: adjustedPurchaseBillId || null,
      items: processedItems,
      gstSlabs,
      taxableSubtotal,
      totalGst,
      roundOff,
      grandTotal,
      status: PURCHASE_RETURN_STATUS.CONFIRMED,
      financialPeriodId,
      reason,
      remarks,
      createdBy: userId,
    };

    createdReturn = await purchaseReturnRepository.createPurchaseReturn(
      returnData,
      { session }
    );

    // C. Adjust against Purchase Bill if specified
    if (adjustedPurchaseBillId) {
      const billToAdjust = await PurchaseBill.findById(
        adjustedPurchaseBillId
      ).session(session);
      if (billToAdjust) {
        const newDue = Math.max(0, (billToAdjust.amountDue || 0) - grandTotal);
        await PurchaseBill.updateOne(
          { _id: adjustedPurchaseBillId },
          { $set: { amountDue: newDue } },
          { session }
        );
      }
    }

    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }

  // 7. Post Journal Voucher (Outside transaction to preserve ledger independent isolation)
  try {
    let cogsAccount =
      (await Account.findOne({
        workspaceId,
        companyId,
        accountCode: "COGS",
      })) ||
      (await Account.findOne({
        workspaceId,
        companyId,
        accountCategory: "PURCHASE",
      }));

    let taxAccount =
      (await Account.findOne({
        workspaceId,
        companyId,
        accountCode: "TAX-PAYABLE",
      })) ||
      (await Account.findOne({
        workspaceId,
        companyId,
        accountCategory: "GST",
      }));

    if (supplier.ledgerAccountId && cogsAccount) {
      const lines = [
        {
          accountId: supplier.ledgerAccountId.toString(),
          debit: grandTotal,
          credit: 0,
          narration: `Debit Note #${debitNoteNo} to ${supplier.businessName}`,
        },
        {
          accountId: cogsAccount._id.toString(),
          debit: 0,
          credit: taxableSubtotal,
          narration: `Purchase Return reversal for #${debitNoteNo}`,
        },
      ];

      if (taxAccount && totalGst > 0) {
        lines.push({
          accountId: taxAccount._id.toString(),
          debit: 0,
          credit: totalGst,
          narration: `ITC Reversal for Debit Note #${debitNoteNo}`,
        });
      }

      // Small rounding adjustment
      const totDebit = lines.reduce((acc, l) => acc + l.debit, 0);
      const totCredit = lines.reduce((acc, l) => acc + l.credit, 0);
      if (Math.abs(totDebit - totCredit) > 0.0001) {
        lines[1].credit += totDebit - totCredit;
      }

      const jv = await journalVoucherService.createJournalVoucher(
        workspaceId,
        companyId,
        userId,
        {
          lines,
          voucherDate: createdReturn.returnDate,
          voucherType: VOUCHER_TYPE.PURCHASE_RETURN,
          referenceNumber: debitNoteNo,
          narration: `Purchase Return / Debit Note: ${debitNoteNo} (${returnNo})`,
          status: VOUCHER_STATUS.POSTED,
        }
      );

      if (jv && jv._id) {
        await purchaseReturnRepository.updatePurchaseReturn(
          createdReturn._id,
          companyId,
          workspaceId,
          { journalVoucherId: jv._id }
        );
      }
    }
  } catch (jvErr) {
    console.error(
      "Failed to auto-create journal voucher for purchase return:",
      jvErr
    );
  }

  // 8. Post GSTR-2 Debit Note Entry in GstLedger
  try {
    const halfGst = totalGst / 2;
    await gstLedgerRepository.createGstLedgerEntry({
      workspaceId,
      companyId,
      branchId: resolvedBranchId,
      partyId: supplierId,
      voucherId: createdReturn._id,
      voucherNumber: debitNoteNo,
      voucherDate: createdReturn.returnDate,
      gstType: "GSTR-2",
      groupDescription: "CDNR - Debit Note",
      taxableAmount: -taxableSubtotal,
      cgst: isIgst ? 0 : -halfGst,
      sgst: isIgst ? 0 : -halfGst,
      igst: isIgst ? -totalGst : 0,
      totalAmount: -grandTotal,
      narration: `Purchase Return Debit Note #${debitNoteNo} to ${supplier.businessName}`,
    });
  } catch (gstErr) {
    console.error("Failed to log GSTR-2 entry for purchase return:", gstErr);
  }

  return createdReturn;
};

/**
 * Get paginated list of purchase returns with filters
 */
const getPurchaseReturns = async (
  workspaceId,
  companyId,
  branchId,
  filters = {},
  pagination = {}
) => {
  let query;

  if (filters.direction === "incoming") {
    // Queries purchase return boxes routed to the active destination facility or company
    query = {
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      isDeleted: false,
      "shippingDetails.transitStatus": { $in: ["IN_TRANSIT", "RECEIVED"] },
    };

    if (branchId && branchId !== "all") {
      query["shippingDetails.destinationBranchId"] = new mongoose.Types.ObjectId(branchId);
    } else if (companyId) {
      query["shippingDetails.destinationCompanyId"] = new mongoose.Types.ObjectId(companyId);
    }
  } else {
    query = {
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
    };

    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }
  }

  if (filters.supplierId) {
    query.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
  }

  if (filters.returnMotive && filters.returnMotive !== "all") {
    query.returnMotive = filters.returnMotive;
  }

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.returnDate = {};
    if (filters.startDate) {
      query.returnDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const eod = new Date(filters.endDate);
      eod.setHours(23, 59, 59, 999);
      query.returnDate.$lte = eod;
    }
  }

  if (filters.search) {
    const searchRegex = { $regex: filters.search.trim(), $options: "i" };
    query.$or = [
      { returnNo: searchRegex },
      { debitNoteNo: searchRegex },
      { reason: searchRegex },
    ];
  }

  return purchaseReturnRepository.findPurchaseReturns(query, pagination);
};

/**
 * Get purchase return details by ID
 */
const getPurchaseReturnById = async (returnId, companyId, workspaceId) => {
  const returnDoc = await purchaseReturnRepository.findPurchaseReturnById(
    returnId,
    companyId,
    workspaceId
  );

  if (!returnDoc) {
    throw new ApiError(404, "Purchase return record not found");
  }

  return returnDoc;
};

/**
 * Cancel a Purchase Return and restock items
 */
const cancelPurchaseReturn = async (
  returnId,
  companyId,
  workspaceId,
  userId,
  reason = ""
) => {
  const returnDoc = await purchaseReturnRepository.findPurchaseReturnById(
    returnId,
    companyId,
    workspaceId
  );

  if (!returnDoc) {
    throw new ApiError(404, "Purchase return record not found");
  }

  if (returnDoc.status === PURCHASE_RETURN_STATUS.CANCELLED) {
    throw new ApiError(400, "Purchase return is already cancelled");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restock items back to original bin
    for (const item of returnDoc.items || []) {
      if (item.sourceBin === "SELLABLE") {
        await Batch.updateOne(
          { _id: item.batchId },
          { $inc: { batchQty: item.returnQty } },
          { session }
        );
        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: returnDoc.branchId,
            product_id: item.productId,
          },
          {
            $inc: {
              total_qty_available: item.returnQty,
              qoh: item.returnQty,
              atp: item.returnQty,
            },
          },
          { session }
        );
      } else if (item.sourceBin === "SCRAP_EXPIRED") {
        await Batch.updateOne(
          { _id: item.batchId },
          {
            $inc: {
              expiredQty: item.returnQty,
              scrapQty: item.returnQty,
            },
          },
          { session }
        );
        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: returnDoc.branchId,
            product_id: item.productId,
          },
          {
            $inc: {
              expiredQty: item.returnQty,
              scrapQty: item.returnQty,
            },
          },
          { session }
        );
      } else if (item.sourceBin === "SCRAP_BROKEN") {
        await Batch.updateOne(
          { _id: item.batchId },
          {
            $inc: {
              brokenQty: item.returnQty,
              scrapQty: item.returnQty,
            },
          },
          { session }
        );
        await ProductFacility.updateOne(
          {
            workspaceId,
            facility_id: returnDoc.branchId,
            product_id: item.productId,
          },
          {
            $inc: {
              brokenQty: item.returnQty,
              scrapQty: item.returnQty,
            },
          },
          { session }
        );
      }
    }

    // Mark return cancelled
    await purchaseReturnRepository.updatePurchaseReturn(
      returnId,
      companyId,
      workspaceId,
      {
        status: PURCHASE_RETURN_STATUS.CANCELLED,
        remarks: reason
          ? `${returnDoc.remarks || ""} | Cancelled: ${reason}`
          : returnDoc.remarks,
      },
      session
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Delete GSTR-2 entry
  try {
    await gstLedgerRepository.deleteGstLedgerEntriesByVoucherId(returnId);
  } catch (gstErr) {
    console.error("Failed to delete GSTR-2 entry on return cancellation:", gstErr);
  }

  return { message: "Purchase return cancelled and stock restored successfully" };
};

/**
 * Dispatch / Ship Purchase Return Box to Destination Hub or Other Company Branch
 */
const dispatchReturnBox = async (
  returnId,
  companyId,
  workspaceId,
  userId,
  dispatchData = {}
) => {
  const {
    destinationCompanyId,
    destinationBranchId,
    boxCount = 1,
    packageNotes = "",
  } = dispatchData;

  if (!destinationBranchId) {
    throw new ApiError(400, "Destination branch is required for consignment shipping");
  }

  const returnDoc = await purchaseReturnRepository.findPurchaseReturnById(
    returnId,
    companyId,
    workspaceId
  );

  if (!returnDoc) {
    throw new ApiError(404, "Purchase return record not found");
  }

  const updated = await PurchaseReturn.findOneAndUpdate(
    {
      _id: returnDoc._id,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    },
    {
      $set: {
        "shippingDetails.destinationCompanyId": destinationCompanyId
          ? new mongoose.Types.ObjectId(destinationCompanyId)
          : null,
        "shippingDetails.destinationBranchId": new mongoose.Types.ObjectId(
          destinationBranchId
        ),
        "shippingDetails.boxCount": Number(boxCount) || 1,
        "shippingDetails.packageNotes": packageNotes || "",
        "shippingDetails.transitStatus": "IN_TRANSIT",
        "shippingDetails.dispatchedAt": new Date(),
        "shippingDetails.dispatchedBy": new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true }
  )
    .populate("companyId", "name legalName")
    .populate("shippingDetails.destinationCompanyId", "name legalName")
    .populate("shippingDetails.destinationBranchId", "name branchCode address phone")
    .populate("supplierId", "businessName gstNumber")
    .lean();

  return updated;
};

/**
 * Mark Incoming Purchase Return Box as Received at Destination Branch
 */
const receiveReturnBox = async (
  returnId,
  companyId,
  branchId,
  workspaceId,
  userId
) => {
  const returnDoc = await PurchaseReturn.findOne({
    _id: returnId,
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    isDeleted: false,
  });

  if (!returnDoc) {
    throw new ApiError(404, "Purchase return record not found");
  }

  if (returnDoc.shippingDetails?.transitStatus === "RECEIVED") {
    throw new ApiError(400, "This consignment box has already been marked as received");
  }

  const updated = await PurchaseReturn.findOneAndUpdate(
    {
      _id: returnDoc._id,
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    },
    {
      $set: {
        "shippingDetails.transitStatus": "RECEIVED",
        "shippingDetails.receivedAt": new Date(),
        "shippingDetails.receivedBy": new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true }
  )
    .populate("companyId", "name legalName")
    .populate("branchId", "name branchCode address")
    .populate("shippingDetails.destinationCompanyId", "name legalName")
    .populate("shippingDetails.destinationBranchId", "name branchCode address phone")
    .populate("shippingDetails.receivedBy", "name")
    .populate("supplierId", "businessName gstNumber")
    .lean();

  return updated;
};

const purchaseReturnService = {
  getEligibleBatchesForReturn,
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  cancelPurchaseReturn,
  dispatchReturnBox,
  receiveReturnBox,
};

export default purchaseReturnService;

