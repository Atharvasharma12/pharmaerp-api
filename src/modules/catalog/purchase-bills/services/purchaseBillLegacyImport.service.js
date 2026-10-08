import xlsx from "xlsx";
import mongoose from "mongoose";
import PurchaseBill from "../models/purchaseBill.model.js";
import Supplier from "../../../parties/suppliers/models/supplier.model.js";
import Account from "../../../finance/chart-of-accounts/models/account.model.js";
import JournalVoucher from "../../../finance/journal-vouchers/models/journalVoucher.model.js";
import journalVoucherService from "../../../finance/journal-vouchers/services/journalVoucher.service.js";
import { PURCHASE_BILL_STATUS } from "../constants/purchaseBill.constant.js";
import { VOUCHER_TYPE } from "../../../finance/journal-vouchers/constants/voucherType.constant.js";
import { VOUCHER_STATUS } from "../../../finance/journal-vouchers/constants/voucherStatus.constant.js";

const normalizeSupplierName = (name = "") => name.toUpperCase().replace(/M\/S\s*/gi, "").replace(/[^A-Z0-9]/g, "").trim();

const extractSupplierHeader = (row) => {
  if (Array.isArray(row)) {
    row = row.join(" ");
  }
  if (typeof row === "string" && /^--[^-]/.test(row)) {
    let text = row.replace(/^--+/, "").trim();
    let parts = text.split(/\s{2,}/);
    return parts[0].trim();
  }
  return null;
};

const extractSupplierBlocks = (rows) => {
  const blocks = [];
  let currentBlock = null;
  let inSupplierSection = false;

  for (const row of rows) {
    const rowStr = Array.isArray(row) ? row.join(" ") : String(row || "");
    if (rowStr.includes("------ SUNDRY CREDITORS (SUPPLIERS)")) {
      inSupplierSection = true;
      continue;
    }
    
    if (!inSupplierSection) continue;
    
    // Stop if we reach another major section (just a guess, assuming it starts with ---- and not a supplier)
    // Actually we only check within SUNDRY CREDITORS. If it ends, we might need a condition, but let's assume it goes till end or we check for specific end marker.
    // For now, look for headers.
    
    const header = extractSupplierHeader(row);
    if (header) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = { header, rows: [] };
    } else if (currentBlock) {
      currentBlock.rows.push(row);
    }
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  return blocks;
};

const parseLedgerTransaction = (text) => {
  const transactionRegex = /^\s*(.*?)\s+(\d{2}-\d{2}-\d{4})\s+(\(?[\d,]+(?:\.\d+)?\)?)\s+(Cr|Dr)/i;
  const match = text.match(transactionRegex);
  if (match) {
    return {
      reference: match[1].replace(/^[\*\s]+/, "").trim() || `NOREF-${match[2]}-${match[3].replace(/[^\d.]/g, "")}`,
      date: match[2],
      amount: parseFloat(match[3].replace(/[^\d.]/g, "")),
      type: match[4].toUpperCase(), // 'CR' or 'DR'
      originalText: text
    };
  }
  return null;
};

const extractSupplierTransactions = (rows) => {
  const transactions = [];
  for (const row of rows) {
    const rowStr = Array.isArray(row) ? row.join(" ") : String(row || "");
    const tx = parseLedgerTransaction(rowStr);
    if (tx) {
      transactions.push(tx);
    }
  }
  return transactions;
};

const classifyTransaction = (transaction) => {
  // Cr = bill. Dr = payment/adjustment
  return transaction.type === "CR" ? "BILL" : "PAYMENT";
};

const calculateSupplierOutstanding = (transactions) => {
  return transactions.reduce((acc, tx) => {
    if (tx.type === "CR") {
      acc.cr += tx.amount;
      acc.outstanding += tx.amount;
    }
    if (tx.type === "DR") {
      acc.dr += tx.amount;
      acc.outstanding -= tx.amount;
    }
    return acc;
  }, { dr: 0, cr: 0, outstanding: 0 });
};

const matchSupplier = (ledgerSupplierName, supplierMap) => {
  const normalized = normalizeSupplierName(ledgerSupplierName);
  if (!normalized) return null;
  
  if (supplierMap.has(normalized)) {
    return supplierMap.get(normalized);
  }
  
  const withoutCity = normalized.replace(/\s*-\s*[A-Z]+$/, "").trim();
  if (withoutCity && supplierMap.has(withoutCity)) {
    return supplierMap.get(withoutCity);
  }
  
  for (const [key, supplier] of supplierMap.entries()) {
    if (!key || key.length < 3) continue; // prevent empty or too short keys from matching everything
    
    // Check if the legacy ledger name starts with the master supplier name
    if (normalized.startsWith(key)) {
      return supplier;
    }
  }
  
  return null;
};

const parseSupplierLedgerWorkbook = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames.find(s => s.toUpperCase().includes("TRIAL BALANCE")) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const blocks = extractSupplierBlocks(rows);
  const parsedData = blocks.map(block => {
    const transactions = extractSupplierTransactions(block.rows);
    return {
      supplierName: block.header,
      transactions: transactions.map(tx => ({ ...tx, classification: classifyTransaction(tx) })),
      outstanding: calculateSupplierOutstanding(transactions)
    };
  });
  
  return parsedData;
};

const reconcileSupplierLedger = (data) => {
  let totalSuppliers = data.length;
  let totalBills = 0;
  let totalAmount = 0;
  let totalDr = 0;
  let totalCr = 0;
  
  data.forEach(supplier => {
    supplier.transactions.forEach(tx => {
      if (tx.classification === "BILL") {
        totalBills++;
        totalAmount += tx.amount;
      }
      if (tx.type === "DR") totalDr += tx.amount;
      if (tx.type === "CR") totalCr += tx.amount;
    });
  });
  
  return { totalSuppliers, totalBills, totalAmount, totalDr, totalCr };
};

const importSupplierBills = async (filePath, workspaceId, companyId, branchId, userId) => {
  const parsedData = parseSupplierLedgerWorkbook(filePath);
  
  // Ensure collections exist before starting transaction (Mongo limitation)
  await mongoose.models.PurchaseBill.createCollection().catch(() => {});
  await mongoose.models.JournalVoucher.createCollection().catch(() => {});
  await mongoose.models.Account.createCollection().catch(() => {});
  await mongoose.models.Ledger?.createCollection().catch(() => {});
  await mongoose.models.AccountBalance?.createCollection().catch(() => {});

  let cogsAccount = await mongoose.models.Account.findOne({ workspaceId, companyId, accountCode: "COGS" }) || await mongoose.models.Account.findOne({ workspaceId, companyId, accountCategory: "PURCHASE" });
  let cashAccount = await mongoose.models.Account.findOne({ workspaceId, companyId, accountCode: "CASH" }) || await mongoose.models.Account.findOne({ workspaceId, companyId, accountCategory: "CASH" });

  if (cogsAccount) {
    // Pre-create COGS balance document outside transaction to avoid WriteConflict on repeated upserts
    await mongoose.models.AccountBalance?.updateOne(
      { accountId: cogsAccount._id, companyId, workspaceId },
      { $setOnInsert: { debitTotal: 0, creditTotal: 0, balance: 0, balanceType: "dr" } },
      { upsert: true }
    ).catch(() => {});
  }
  if (cashAccount) {
    await mongoose.models.AccountBalance?.updateOne(
      { accountId: cashAccount._id, companyId, workspaceId },
      { $setOnInsert: { debitTotal: 0, creditTotal: 0, balance: 0, balanceType: "dr" } },
      { upsert: true }
    ).catch(() => {});
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const SupplierModel = mongoose.models.Supplier;
    const AccountGroupModel = mongoose.models.AccountGroup;
    let creditorsGroup = await AccountGroupModel.findOne({ workspaceId, companyId, groupName: "Sundry Creditors" }).session(session);
    if (!creditorsGroup) {
      creditorsGroup = await AccountGroupModel.findOne({ workspaceId, companyId, groupCode: "SUNDRY_CREDITORS" }).session(session);
    }
    const suppliers = await SupplierModel.find({ workspaceId, companyId, isDeleted: false }).session(session);
    const supplierMap = new Map();
    suppliers.forEach(s => {
      supplierMap.set(normalizeSupplierName(s.businessName), s);
    });
    
    const billsToInsert = [];
    let skippedDuplicates = 0;
    let missingSuppliers = [];
    let validationErrors = [];
    
    const matchedSupplierIds = [...supplierMap.values()].map(s => s._id);
    const existingBills = await PurchaseBill.find(
      { workspaceId, companyId, supplierId: { $in: matchedSupplierIds } }, 
      { supplierInvoiceNo: 1, supplierId: 1 }
    ).session(session).lean();
    const existingBillsSet = new Set(existingBills.map(b => `${b.supplierId}-${b.supplierInvoiceNo}`));

    // We already found cogsAccount, just get it again with session to be safe
    cogsAccount = await mongoose.models.Account.findOne({ workspaceId, companyId, accountCode: "COGS" }).session(session) || await mongoose.models.Account.findOne({ workspaceId, companyId, accountCategory: "PURCHASE" }).session(session);

    const combinedBillLines = [];
    const combinedPaymentLines = [];
    let totalCogsDebit = 0;
    let totalCashCredit = 0;

    for (const supplierData of parsedData) {
      const matchedSupplier = matchSupplier(supplierData.supplierName, supplierMap);
      if (!matchedSupplier) {
        missingSuppliers.push(supplierData.supplierName);
        continue;
      }
      
      let legacyPurchaseBillTotal = 0;
      let legacyPaymentTotal = 0;

      for (const tx of supplierData.transactions) {
        if (tx.classification === "PAYMENT" || tx.type === "DR") {
          legacyPaymentTotal += tx.amount;
        }
        if (tx.classification === "BILL" || (tx.type === "CR" && tx.classification !== "PAYMENT")) {
          const uniqueKey = `${matchedSupplier._id}-${tx.reference}`;
          
          if (existingBillsSet.has(uniqueKey)) {
            skippedDuplicates++;
            continue;
          }
          
          legacyPurchaseBillTotal += tx.amount;
          
          const invoiceNumberSaved = tx.reference;
          const uniquePurchaseBillNo = `LEG-${invoiceNumberSaved}-${matchedSupplier._id.toString().substring(18)}`;
          
          billsToInsert.push({
            workspaceId,
            companyId,
            branchId,
            supplierId: matchedSupplier._id,
            purchaseBillNo: uniquePurchaseBillNo,
            supplierInvoiceNo: invoiceNumberSaved,
            legacyReference: tx.reference,
            invoiceDate: tx.date,
            status: PURCHASE_BILL_STATUS.CONFIRMED,
            createdBy: userId,
            grossTotal: tx.amount,
            grandTotal: tx.amount,
            amountDue: tx.amount,
            amountPaid: 0,
            items: [],
            rateBasis: "PTS",
            isDeleted: false
          });
          existingBillsSet.add(uniqueKey);
        }
      }

      if (!matchedSupplier.ledgerAccountId) {
        const AccountModel = mongoose.models.Account;
        
        let newAccount = await AccountModel.findOne({ workspaceId, companyId, accountName: `${matchedSupplier.businessName} - Supplier` }).session(session);
        if (!newAccount) {
          newAccount = await AccountModel.create([{
            workspaceId,
            companyId,
            accountCode: `SUPP-${matchedSupplier.supplierCode || Date.now()}`,
            accountName: `${matchedSupplier.businessName} - Supplier`,
            accountGroupId: creditorsGroup ? creditorsGroup._id : null,
            accountNature: "LIABILITY",
            accountCategory: "SUPPLIER",
            openingBalance: matchedSupplier.openingBalance || 0,
            openingBalanceType: matchedSupplier.openingBalanceType || "cr",
            status: "active"
          }], { session });
          newAccount = newAccount[0];
        }
        
        matchedSupplier.ledgerAccountId = newAccount._id;
        await SupplierModel.updateOne({ _id: matchedSupplier._id }, { ledgerAccountId: newAccount._id }, { session });
      }

      if (matchedSupplier.ledgerAccountId && cogsAccount) {
        // Compound Bills (Cr Supplier, Dr COGS aggregated)
        if (legacyPurchaseBillTotal > 0) {
          totalCogsDebit += legacyPurchaseBillTotal;
          combinedBillLines.push({ 
            accountId: matchedSupplier.ledgerAccountId.toString(), 
            debit: 0, 
            credit: legacyPurchaseBillTotal, 
            narration: `Legacy purchase bills for ${matchedSupplier.businessName}` 
          });
        }

        // Compound Payments (Dr Supplier, Cr Cash aggregated)
        if (legacyPaymentTotal > 0) {
          const jvRefPayments = `LEGACY-IMPORT-PAYMENTS-${matchedSupplier._id}`;
          const existingJvPayments = await JournalVoucher.findOne({ workspaceId, companyId, referenceNumber: jvRefPayments }).session(session);
          
          if (!existingJvPayments) {
            totalCashCredit += legacyPaymentTotal;
            combinedPaymentLines.push({ 
              accountId: matchedSupplier.ledgerAccountId.toString(), 
              debit: legacyPaymentTotal, 
              credit: 0, 
              narration: `Legacy payments for ${matchedSupplier.businessName}` 
            });
            // Create a dummy record so it skips on future re-imports
            await JournalVoucher.create([{
              workspaceId, companyId, voucherNumber: jvRefPayments, voucherDate: new Date(), voucherType: "PAYMENT", referenceNumber: jvRefPayments, status: "DRAFT", createdBy: userId
            }], { session });
          }
        }
      }
    }
    
    // Dispatch Compound Bills JV
    if (combinedBillLines.length > 0 && totalCogsDebit > 0) {
      combinedBillLines.unshift({ 
        accountId: cogsAccount._id.toString(), debit: totalCogsDebit, credit: 0, narration: "Bulk Legacy Purchase Bills (COGS)" 
      });
      const bulkBillRef = `LEGACY-BULK-BILLS-${Date.now()}`;
      await journalVoucherService.createJournalVoucher(workspaceId, companyId, userId, {
        voucherNumber: bulkBillRef, lines: combinedBillLines, voucherDate: new Date(), voucherType: VOUCHER_TYPE.PURCHASE, referenceNumber: bulkBillRef, narration: "Bulk legacy purchase bills import", status: VOUCHER_STATUS.POSTED,
      }, { session });
    }

    // Dispatch Compound Payments JV
    if (combinedPaymentLines.length > 0 && totalCashCredit > 0) {
      const creditAccountId = cashAccount ? cashAccount._id.toString() : cogsAccount._id.toString();
      combinedPaymentLines.push({ 
        accountId: creditAccountId, debit: 0, credit: totalCashCredit, narration: "Bulk Legacy Payments" 
      });
      const bulkPaymentRef = `LEGACY-BULK-PAYMENTS-${Date.now()}`;
      await journalVoucherService.createJournalVoucher(workspaceId, companyId, userId, {
        voucherNumber: bulkPaymentRef, lines: combinedPaymentLines, voucherDate: new Date(), voucherType: VOUCHER_TYPE.PAYMENT, referenceNumber: bulkPaymentRef, narration: "Bulk legacy payments import", status: VOUCHER_STATUS.POSTED,
      }, { session });
    }

    if (billsToInsert.length > 0) {
      await PurchaseBill.insertMany(billsToInsert, { session });
    }
  
  const stats = reconcileSupplierLedger(parsedData);
  
  await session.commitTransaction();
  
  return {
    stats,
    importedCount: billsToInsert.length,
    skippedDuplicates,
    missingSuppliers: [...new Set(missingSuppliers)],
    validationErrors
  };
  
  } catch (error) {
    console.error("Legacy Import Transaction Failed:", error);
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default {
  parseSupplierLedgerWorkbook,
  extractSupplierBlocks,
  extractSupplierHeader,
  extractSupplierTransactions,
  parseLedgerTransaction,
  normalizeSupplierName,
  matchSupplier,
  classifyTransaction,
  calculateSupplierOutstanding,
  reconcileSupplierLedger,
  importSupplierBills
};
