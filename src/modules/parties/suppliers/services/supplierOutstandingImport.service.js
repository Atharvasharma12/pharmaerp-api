import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import Supplier from "../models/supplier.model.js";
import SupplierStatement from "../models/supplierStatement.model.js";
import PurchaseBill from "../../../catalog/purchase-bills/models/purchaseBill.model.js";
import { PURCHASE_BILL_STATUS } from "../../../catalog/purchase-bills/constants/purchaseBill.constant.js";
import { parseSupplierOutstandingExcel } from "./supplierOutstandingParser.service.js";

const normalizeSupplierName = (name) => {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
};


const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

const findNearestMatch = (name, candidates) => {
  if (!name || !candidates || (candidates.length === 0 && candidates.size === 0)) return null;
  const lowerName = name.toLowerCase().replace(/\s+/g, " ").trim();
  let bestMatch = null;
  let minDistance = Infinity;

  // First check inclusion (often the case with B2B names)
  for (const candidate of candidates) {
    if (candidate.includes(lowerName) || lowerName.includes(candidate)) {
      const dist = Math.abs(candidate.length - lowerName.length);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = candidate;
      }
    }
  }

  // If no inclusion match, fall back to Levenshtein distance
  if (!bestMatch) {
    for (const candidate of candidates) {
      const dist = levenshteinDistance(lowerName, candidate);
      const maxAllowed = Math.max(3, Math.floor(lowerName.length * 0.3));
      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestMatch = candidate;
      }
    }
  }
  return bestMatch;
};

const normalizeInvoiceNumber = (inv) => {
  if (!inv) return null;
  const val = inv.replace(/^\*+\s*/g, "").trim().toUpperCase();
  if (val.replace(/\*/g, '').trim() === "") return null;
  return val;
};

export const previewOutstandingImport = async (workspaceId, companyId, fileBuffer) => {
  const { reportDate, transactions } = parseSupplierOutstandingExcel(fileBuffer);

  if (!transactions || transactions.length === 0) {
    throw new ApiError(400, "No valid transactions found in the Excel file.");
  }

  const existingSuppliers = await Supplier.find({
    workspaceId,
    companyId,
    isDeleted: false
  }).select('businessName _id').lean();
  
  const supplierMap = new Map();
  for (const s of existingSuppliers) {
    supplierMap.set(normalizeSupplierName(s.businessName), s);
  }
  
  const existingBills = await PurchaseBill.find({
    workspaceId,
    companyId,
    isDeleted: false
  }).select('supplierId supplierInvoiceNo').lean();
  
  const existingBillsSet = new Set(existingBills.map(b => `${b.supplierId}-${b.supplierInvoiceNo}`));
  const seenKeysInFile = new Set();
  
  const previewData = transactions.map((tx) => {
    let status = "NEW";
    let matchedSupplier = null;
    let matchStatus = "NOT_FOUND";
    let normalizedInv = normalizeInvoiceNumber(tx.invoiceNumber);
    let supplierId = null;

    const normName = normalizeSupplierName(tx.supplierName);
    
    if (tx.supplierName === "SUPPLIER_CONTEXT_MISSING") {
      status = "SUPPLIER_CONTEXT_MISSING";
    } else {
      // Attempt exact match
      if (supplierMap.has(normName)) {
        matchedSupplier = supplierMap.get(normName);
        matchStatus = "MATCHED";
      } else {
         // Attempt startsWith match
         for (const [key, s] of supplierMap.entries()) {
           if (key.length > 3 && normName.startsWith(key)) {
             matchedSupplier = s;
             matchStatus = "MATCHED"; 
             break;
           }
         }
         
         // If still no match, find nearest match for suggestion
         if (!matchedSupplier) {
             const matchKey = findNearestMatch(normName, Array.from(supplierMap.keys()));
             if (matchKey) {
                 const suggested = supplierMap.get(matchKey).businessName;
                 matchedSupplier = supplierMap.get(matchKey); matchStatus = `MATCHED (Auto-corrected to "${suggested}")`;
             }
         }
      }
    }
    
    if (matchedSupplier) {
       supplierId = matchedSupplier._id;
    }

    if (status !== "SUPPLIER_CONTEXT_MISSING") {
      if (!matchedSupplier) {
         status = "SUPPLIER_NOT_FOUND";
      } else if (!normalizedInv || normalizedInv === "UPTO") {
         normalizedInv = `TX-${tx.rowNumber}`;
      }
      
      if (status === "NEW") {
         const key = `${supplierId}-${normalizedInv}`;
         if (existingBillsSet.has(key)) {
           status = "ALREADY_IMPORTED";
         } else if (seenKeysInFile.has(key)) {
           status = "DUPLICATE_IN_FILE";
         } else {
           seenKeysInFile.add(key);
         }
      }
    }

    return {
      rowNumber: tx.rowNumber,
      isValid: status === "NEW",
      status,
      matchStatus,
      data: {
        supplierId: supplierId,
        supplierName: tx.supplierName,
        invoiceNumber: normalizedInv || tx.invoiceNumber, // keep original for display if no norm
        invoiceDate: tx.date,
        amount: tx.amount,
        type: tx.type,
      }
    };
  });

  const stats = {
     totalParsedTransactions: transactions.length,
     validCreditTransactions: previewData.filter(t => t.isValid && t.data.type === "CR").length,
     debitTransactions: previewData.filter(t => t.status === "DEBIT_TRANSACTION").length,
     supplierMatches: previewData.filter(t => t.matchStatus === "MATCHED").length,
     supplierNotFound: previewData.filter(t => t.status === "SUPPLIER_NOT_FOUND").length,
     ambiguousSuppliers: previewData.filter(t => t.matchStatus === "AMBIGUOUS").length,
     alreadyImported: previewData.filter(t => t.status === "ALREADY_IMPORTED").length,
     duplicateInFile: previewData.filter(t => t.status === "DUPLICATE_IN_FILE").length,
     invalidTransactions: previewData.filter(t => !t.isValid).length,
     missingSupplierContext: previewData.filter(t => t.status === "SUPPLIER_CONTEXT_MISSING").length
  };

  return previewData;
};

export const confirmOutstandingImport = async (workspaceId, companyId, userId, transactionsToImport) => {
  const session = await mongoose.startSession();
  let successful = 0;
  let failed = 0;
  let errors = [];

  try {
    session.startTransaction();

    const existingBills = await PurchaseBill.find({
      workspaceId,
      companyId,
      isDeleted: false
    }).select('supplierId supplierInvoiceNo').lean().session(session);
    
    const existingBillsSet = new Set(existingBills.map(b => `${b.supplierId}-${b.supplierInvoiceNo}`));
    const seenKeysInTransaction = new Set();
    
    const billsToInsert = [];
    const statementsToInsert = [];
    const supplierUpdatesMap = new Map();

    for (const data of transactionsToImport) {
      if (!data.supplierId || !data.invoiceNumber) {
         failed++;
         errors.push(`Row ${data.invoiceNumber || 'Unknown'}: Invalid data`);
         continue;
      }
      
      const normalizedInv = normalizeInvoiceNumber(data.invoiceNumber);
      const key = `${data.supplierId}-${normalizedInv}`;
      
      if (existingBillsSet.has(key) || seenKeysInTransaction.has(key)) {
         failed++;
         errors.push(`Invoice ${normalizedInv}: Duplicate skipped during commit`);
         continue;
      }
      
      seenKeysInTransaction.add(key);
      
      const cid = data.supplierId.toString();
      const amtChange = data.type === "DR" ? -(data.amount || 0) : (data.amount || 0);
      supplierUpdatesMap.set(cid, (supplierUpdatesMap.get(cid) || 0) + amtChange);

      // Parse date
      let parsedDate = new Date();
      if (data.invoiceDate) {
         const parts = data.invoiceDate.split("-");
         if (parts.length === 3) {
             const d = parts[0];
             const m = parts[1];
             let y = parts[2];
             if (y.length === 2) y = "20" + y;
             parsedDate = new Date(`${y}-${m}-${d}`);
         }
      }

      // Generate a unique PB number
      const pbNumber = `LEG-${normalizedInv}-${data.supplierId.toString().substring(18)}`;

      const pbId = new mongoose.Types.ObjectId();
      
      if (data.type === "CR") {
        billsToInsert.push({
           _id: pbId,
           workspaceId,
           companyId,
           branchId: null, // Depending on if it's required
           supplierId: data.supplierId,
           purchaseBillNo: pbNumber,
           supplierInvoiceNo: normalizedInv,
           legacyReference: data.invoiceNumber,
           invoiceDate: parsedDate,
           status: PURCHASE_BILL_STATUS.CONFIRMED,
           createdBy: userId,
           grossTotal: data.amount || 0,
           grandTotal: data.amount || 0,
           amountDue: data.amount || 0,
           amountPaid: 0,
           items: [{
               itemName: "Historical Outstanding",
               qty: 1,
               rate: data.amount || 0,
               amount: data.amount || 0
           }],
           rateBasis: "PTS",
           isDeleted: false,
           legacyImportKey: key // Optional extra protection field
        });
      }

      statementsToInsert.push({
         workspaceId,
         companyId,
         supplierId: data.supplierId,
         transactionType: data.type === "DR" ? "PAYMENT" : "PURCHASE_BILL",
         referenceType: data.type === "DR" ? "LEGACY_PAYMENT" : "LEGACY_PURCHASE_BILL",
         reference: data.type === "DR" ? `LEG-PAY-${normalizedInv}` : pbNumber,
         description: `Legacy ${data.type === "DR" ? "Payment/Debit" : "Outstanding Bill"} ${normalizedInv}`,
         amount: data.amount,
         debit: data.type === "DR" ? data.amount : 0,
         credit: data.type === "CR" ? data.amount : 0,
         date: parsedDate
      });
      
      successful++;
    }

    if (supplierUpdatesMap.size > 0) {
      const bulkOps = [];
      for (const [cid, additionalBalance] of supplierUpdatesMap.entries()) {
        bulkOps.push({
          updateOne: {
            filter: { _id: cid },
            update: { 
              $inc: { openingBalance: additionalBalance },
              $set: { openingBalanceType: "cr" }
            }
          }
        });
      }
      await Supplier.bulkWrite(bulkOps, { session });
    }

    if (billsToInsert.length > 0) {
      await PurchaseBill.insertMany(billsToInsert, { session });
    }
    
    if (statementsToInsert.length > 0) {
      // Need to insert statements but unique index is { supplierId: 1, referenceType: 1, description: 1 }
      await SupplierStatement.insertMany(statementsToInsert, { session });
    }

    await session.commitTransaction();
    return { successful, failed, errors };
  } catch (error) {
    await session.abortTransaction();
    console.error("Confirm Outstanding Import failed:", error);
    throw error;
  } finally {
    session.endSession();
  }
};
