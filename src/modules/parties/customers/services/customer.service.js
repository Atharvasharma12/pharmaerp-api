import xlsx from "xlsx";
import { parseB2BOutstandingExcel } from "./b2bOutstandingParser.service.js";
import SalesInvoice from "../../../sales/invoices/models/invoice.model.js";


import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import customerRepository from "../repositories/customer.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import gstLedgerRepository from "../../../finance/gst-ledger/repositories/gstLedger.repository.js";
import financialPeriodRepository from "../../../finance/financial-periods/repositories/financialPeriod.repository.js";
import { CUSTOMER_STATUS } from "../constants/customer.constant.js";
import Customer from "../models/customer.model.js";
import Batch from "../../../catalog/products/models/batch.model.js";
import ProductFacility from "../../../catalog/products/models/productFacility.model.js";
import accountRepository from "../../../finance/chart-of-accounts/repositories/account.repository.js";
import accountGroupRepository from "../../../finance/chart-of-accounts/repositories/accountGroup.repository.js";
import openingBalanceService from "../../../finance/opening-balances/services/openingBalance.service.js";
import ledgerService from "../../../finance/ledger/services/ledger.service.js";

const createCustomer = async (workspaceId, companyId, userId, payload) => {
  const {
    branchId,
    customerCode,
    customerType,
    name,
    mobile,
    alternateMobile,
    email,
    gstNumber,
    panNumber,
    drugLicenseNumber,
    billingAddress,
    shippingAddress,
    creditLimit,
    creditDays,
    openingBalance,
    openingBalanceType,
    notes,
    status,
  } = payload;

  if (branchId) {
    const branch = await branchRepository.findBranchByIdAndCompany(
      branchId,
      companyId,
    );
    if (!branch) {
      throw new ApiError(404, "Branch not found under this company");
    }
  }

  if (customerCode) {
    const existing = await customerRepository.findCustomerByCode(customerCode);
    if (existing) {
      throw new ApiError(400, "Customer with this code already exists");
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get or create CURRENT_ASSETS account group
    let currentAssetsGroup = await accountGroupRepository.findGroupByCode(companyId, "CURRENT_ASSETS", { session });
    
    if (!currentAssetsGroup) {
      currentAssetsGroup = await accountGroupRepository.createGroup({
        workspaceId,
        companyId,
        groupCode: "CURRENT_ASSETS",
        groupName: "Current Assets",
        nature: "ASSET",
        parentGroupId: null,
        isSystemGroup: true,
        createdBy: userId,
      }, { session });
    }

    // 2. Get or create SUNDRY_DEBTORS account group
    let sundryDebtorsGroup = await accountGroupRepository.findGroupByCode(companyId, "SUNDRY_DEBTORS", { session });
    
    if (!sundryDebtorsGroup) {
      sundryDebtorsGroup = await accountGroupRepository.createGroup({
        workspaceId,
        companyId,
        groupCode: "SUNDRY_DEBTORS",
        groupName: "Sundry Debtors",
        nature: "ASSET",
        parentGroupId: currentAssetsGroup._id,
        isSystemGroup: true,
        createdBy: userId,
      }, { session });
    }

    // 3. Create the Ledger Account for the customer under SUNDRY_DEBTORS
    const accCode = customerCode ? `CUST-${customerCode}` : `CUST-${Date.now()}`;
    const ledgerAccount = await accountRepository.createAccount({
      workspaceId,
      companyId,
      accountCode: accCode,
      accountName: `${name} - Customer`,
      accountGroupId: sundryDebtorsGroup._id,
      accountNature: "ASSET",
      accountCategory: "CUSTOMER",
      openingBalance: openingBalance || 0,
      openingBalanceType: openingBalanceType || "dr",
      status: "active",
      isSystemAccount: false,
      createdBy: userId,
    }, { session });

    // 3. Create the Customer with the linked ledger account
    const customer = await customerRepository.createCustomer({
      workspaceId,
      companyId,
      branchId: branchId || null,
      customerCode,
      customerType,
      name,
      mobile,
      alternateMobile,
      email,
      gstNumber,
      panNumber,
      drugLicenseNumber,
      billingAddress,
      shippingAddress,
      creditLimit,
      creditDays,
      openingBalance,
      openingBalanceType,
      notes,
      status,
      ledgerAccountId: ledgerAccount._id,
      createdBy: userId,
    }, { session });

    // 4. Post Opening Balance Journal if opening balance is provided
    console.log("--- CUSTOMER CREATION LOG ---");
    console.log(`Customer Ledger Account created with ID: ${ledgerAccount._id}`);
    console.log(`Opening Balance value: ${openingBalance}`);
    if (openingBalance && openingBalance > 0) {
      console.log("Posting Opening Balance Journal...");
      try {
        await openingBalanceService.postOpeningBalanceJournal(
          workspaceId,
          companyId,
          userId,
          ledgerAccount._id,
          openingBalance,
          openingBalanceType || "dr",
          { session }
        );
        console.log("Successfully posted Opening Balance Journal");
      } catch (err) {
        console.error("Failed to post opening balance:", err);
      }
    } else {
      console.log("No opening balance provided or it is <= 0. Skipping journal.");
    }

    await session.commitTransaction();
    session.endSession();

    return customer.toSafeObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getCustomers = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, ...filters } = query;
  const result = await customerRepository.getCustomers(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort },
  );

  return {
    customers: result.customers.map((c) => {
      const obj = c.toSafeObject();
      obj.outstandingAmount = obj.openingBalance || 0;
      obj.balanceType = obj.openingBalanceType || "dr";
      return obj;
    }),
    total: result.total,
    page: result.page,
    limit: result.limit,
    stats: result.stats,
  };
};

const getCustomerById = async (customerId, companyId, workspaceId) => {
  const customer = await customerRepository.findCustomerByIdCompanyAndWorkspace(
    customerId,
    companyId,
    workspaceId,
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer.toSafeObject();
};

const updateCustomer = async (
  customerId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const customer = await customerRepository.findCustomerByIdCompanyAndWorkspace(
    customerId,
    companyId,
    workspaceId,
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  if (payload.branchId) {
    const branch = await branchRepository.findBranchByIdAndCompany(
      payload.branchId,
      companyId,
    );
    if (!branch) {
      throw new ApiError(404, "Branch not found under this company");
    }
  }

  if (payload.customerCode && payload.customerCode !== customer.customerCode) {
    const existing = await customerRepository.findCustomerByCode(
      payload.customerCode,
    );
    if (existing && existing._id.toString() !== customer._id.toString()) {
      throw new ApiError(400, "Customer with this code already exists");
    }
  }

  const allowedFields = [
    "branchId",
    "customerCode",
    "customerType",
    "name",
    "mobile",
    "alternateMobile",
    "email",
    "gstNumber",
    "panNumber",
    "drugLicenseNumber",
    "billingAddress",
    "shippingAddress",
    "creditLimit",
    "creditDays",
    "openingBalance",
    "openingBalanceType",
    "notes",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      customer[field] = payload[field];
    }
  });

  await customerRepository.saveCustomer(customer);

  return customer.toSafeObject();
};

const deleteCustomer = async (customerId, companyId, workspaceId, userId) => {
  const customer = await customerRepository.deleteCustomerById(
    customerId,
    companyId,
    workspaceId,
    userId,
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return { success: true };
};

/*
|--------------------------------------------------------------------------
| Additional Financial / Sales / Outstanding Stubs
|--------------------------------------------------------------------------
*/

const getCustomerLedger = async (customerId, companyId, workspaceId, query = {}) => {
  const customer = await getCustomerById(customerId, companyId, workspaceId);

  if (!customer.ledgerAccountId) {
    return [];
  }

  const ledgerResult = await ledgerService.getLedger(
    workspaceId,
    companyId,
    { 
      accountId: customer.ledgerAccountId, 
      sort: query.sort || { voucherDate: -1, createdAt: -1 },
      ...query 
    }
  );

  return ledgerResult;
};

const getCustomerOutstanding = async (customerId, companyId, workspaceId) => {
  const customer = await getCustomerById(customerId, companyId, workspaceId);

  return {
    outstandingAmount: customer.openingBalance || 0,
    balanceType: customer.openingBalanceType || "dr",
  };
};

const getCustomerPayments = async (customerId, companyId, workspaceId) => {
  await getCustomerById(customerId, companyId, workspaceId);
  return [];
};


const GST_STATE_CODES = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
  "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya",
  "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

const previewImport = async (workspaceId, companyId, fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Read as array of arrays first to find the header row
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  
  if (rawRows.length === 0) {
    throw new ApiError(400, "The Excel file is empty.");
  }

  // Find the header row (look for common keywords and multiple columns)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    const validCells = rawRows[i].filter(c => String(c).trim() !== "");
    const rowStr = rawRows[i].map(c => String(c).toLowerCase()).join(" ");
    
    // Real header row has multiple columns and combinations of keywords
    if (
      validCells.length >= 3 && 
      (rowStr.includes("name") || rowStr.includes("customer") || rowStr.includes("ledger") || rowStr.includes("party")) &&
      (rowStr.includes("mobile") || rowStr.includes("phone") || rowStr.includes("sno") || rowStr.includes("balance") || rowStr.includes("email"))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(h => String(h).toLowerCase().trim());
  const dataRows = rawRows.slice(headerRowIndex + 1);

  const data = dataRows.map(rowArr => {
    const obj = {};
    let lastHeader = "";
    headers.forEach((h, idx) => {
      let currentHeader = h;
      if (currentHeader) {
        lastHeader = currentHeader;
      } else if (lastHeader.includes("mobile") || lastHeader.includes("phone")) {
        currentHeader = `${lastHeader}_${idx}`; 
      }
      
      if (currentHeader && rowArr[idx] !== undefined && rowArr[idx] !== "") {
        obj[currentHeader] = rowArr[idx];
      }
    });
    return obj;
  }).filter(row => Object.keys(row).length > 0);

  const existingCustomers = await customerRepository.getCustomers(
    workspaceId,
    companyId,
    {},
    { limit: 100000 }
  );
  
  const existingMobilePhones = new Set(existingCustomers.customers.map(s => s.mobile).filter(Boolean));
  const existingEmails = new Set(existingCustomers.customers.map(s => s.email).filter(Boolean));
  const existingGSTs = new Set(existingCustomers.customers.map(s => s.gstNumber).filter(Boolean));
  const existingPANs = new Set(existingCustomers.customers.map(s => s.panNumber).filter(Boolean));
  const existingNames = new Set(existingCustomers.customers.map(s => s.name.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean));

  const parsedRows = data.map((lowerRow, index) => {
    const businessName = String(lowerRow["name"] || lowerRow["customer name"] || lowerRow["customer"] || lowerRow["supplier name"] || lowerRow["ledger name"] || lowerRow["party name"] || lowerRow["ledger"] || "").trim();
    
    // Extract mobile from any column that looks like mobile/phone
    let mobile = "";
    let alternateMobile = "";
    const mobileKeys = Object.keys(lowerRow).filter(k => k.includes("mobile") || k.includes("phone"));
    for (const mk of mobileKeys) {
      const val = String(lowerRow[mk]).replace(/\D/g, ''); // Extract only digits
      if (val.length >= 10) {
        const potentialMobile = val.substring(val.length - 10); // get last 10 digits
        if (/^[6-9][0-9]{9}$/.test(potentialMobile)) {
          if (!mobile) {
            mobile = potentialMobile;
          } else if (!alternateMobile && potentialMobile !== mobile) {
            alternateMobile = potentialMobile;
          }
        }
      }
    }

    const email = String(lowerRow["email"] || "").trim();
    const gstNumber = String(lowerRow["gstin"] || lowerRow["gstin no."] || lowerRow["gstin no"] || lowerRow["gst"] || lowerRow["gst number"] || lowerRow["gst no"] || lowerRow["gst no."] || lowerRow["tin"] || "").trim();
    const panNumber = String(lowerRow["pan"] || lowerRow["panno"] || lowerRow["pan number"] || lowerRow["pan no."] || lowerRow["pan no"] || "").trim();
    const contactPerson = String(lowerRow["contact"] || lowerRow["contact person"] || "").trim();
    
    const addressLine1 = String(lowerRow["address1"] || lowerRow["address"] || lowerRow["address & details"] || "").trim();
    const addressLine2 = [
      String(lowerRow["address2"] || ""),
      String(lowerRow["address3"] || "")
    ].filter(Boolean).map(s => s.trim()).join(", ");
    const city = String(lowerRow["city"] || "").trim();
    const pincode = String(lowerRow["pin"] || lowerRow["pincode"] || "").trim();
    
    // License
    const drugLicenseNumber = String(lowerRow["licence"] || lowerRow["dl no"] || lowerRow["dl number"] || lowerRow["dl no."] || lowerRow["dl"] || lowerRow["drug license"] || "").trim();

    // Extract balance
    let openingBalance = 0;
    let openingBalanceType = "cr";
    

    let creditDays = 0;
    const rawCreditDays = String(lowerRow["crdays"] || lowerRow["credit days"] || "").trim();
    if (rawCreditDays) {
      const numMatch = rawCreditDays.match(/\d+/);
      if (numMatch) {
        creditDays = parseInt(numMatch[0], 10) || 0;
      }
    }

    const errors = [];

    // Skip completely empty rows or rows that are just repeated headers (common in PDF/Excel reports)
    const normalizedName = businessName.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!businessName || normalizedName === "ledger name" || normalizedName === "name" || normalizedName === "customer name" || normalizedName === "customer" || normalizedName === "party name" || normalizedName === "ledger") {
      return null;
    }

    if (!businessName) {
      errors.push("Business Name is required");
    }
    
    if (mobile) {
      if (!/^[6-9][0-9]{9}$/.test(mobile)) errors.push("Invalid mobile number format");
      else if (existingMobilePhones.has(mobile)) errors.push("Mobile number already exists in workspace or this file");
      else existingMobilePhones.add(mobile);
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
    }

    let state = null;
    if (gstNumber) {
      // Relaxed validation to allow 12-character legacy GSTs (State Code + PAN)
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(gstNumber)) errors.push("Invalid GST Number format");
      else if (existingGSTs.has(gstNumber)) errors.push("GST Number already exists in workspace or this file");
      else {
        existingGSTs.add(gstNumber);
        const stateCode = gstNumber.substring(0, 2);
        if (GST_STATE_CODES[stateCode]) {
          state = GST_STATE_CODES[stateCode];
        }
      }
    }

    if (panNumber) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) errors.push("Invalid PAN Number format");
      else if (existingPANs.has(panNumber)) errors.push("PAN Number already exists in workspace or this file");
      else existingPANs.add(panNumber);
    }



    return {
      rowNumber: index + headerRowIndex + 2, // Accounting for header and 0-indexing
      data: {
        name: businessName,
        contactPerson: contactPerson || null,
        mobile: mobile || null,
        alternateMobile: alternateMobile || null,
        email: email || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        drugLicenseNumber: drugLicenseNumber || null,
        address: { 
          addressLine1,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null
        },
        openingBalance,
        openingBalanceType,
        creditDays,
      },
      isValid: errors.length === 0,
      errors
    };
  }).filter(Boolean); // Filter out skipped null rows

  return parsedRows;
};

const confirmImport = async (workspaceId, companyId, userId, customersData) => {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    const payloads = customersData.map(customerData => ({
      ...customerData,
      workspaceId,
      companyId,
      createdBy: userId,
    }));

    // Use bulk insertion
    await customerRepository.insertManyCustomers(payloads);
    
    results.successful = payloads.length;
  } catch (error) {
    if (error.writeErrors) {
      // If some failed in unordered bulk op
      results.successful = customersData.length - error.writeErrors.length;
      results.failed = error.writeErrors.length;
      error.writeErrors.forEach(err => {
        results.errors.push(`Failed for index ${err.index}: ${err.errmsg}`);
      });
    } else {
      results.failed = customersData.length;
      results.errors.push(`Bulk import failed: ${error.message}`);
    }
  }

  return results;
};


const previewB2BOutstandingImport = async (workspaceId, companyId, fileBuffer) => {
  const { reportDate, invoices } = parseB2BOutstandingExcel(fileBuffer);
  
  if (!invoices || invoices.length === 0) {
    throw new ApiError(400, "No valid invoices found in the Excel file.");
  }

  // To check duplicates efficiently, fetch all existing invoice numbers for this company
  const existingInvoices = await SalesInvoice.find({
    workspaceId,
    companyId,
    isDeleted: false
  }).select('invoiceNo').lean();
  
  const existingInvoiceSet = new Set(existingInvoices.map(i => i.invoiceNo));

  const previewData = invoices.map((inv) => {
    const errors = [];
    
    if (!inv.invoiceNumber) errors.push("Invoice number is missing");
    if (!inv.invoiceDate) errors.push("Invoice date is missing/invalid");
    if (isNaN(inv.billAmount)) errors.push("Bill amount is invalid");
    if (isNaN(inv.outstandingAmount)) errors.push("Outstanding amount is invalid");
    if (!inv.customerName) errors.push("Customer name is missing");

    if (existingInvoiceSet.has(inv.invoiceNumber)) {
      errors.push("Invoice number already exists in the system (Already Imported)");
    }

    return {
      rowNumber: inv.rowNumber,
      isValid: errors.length === 0,
      errors,
      data: {
        name: inv.customerName,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        billAmount: inv.billAmount,
        openingBalance: inv.outstandingAmount,
        openingBalanceType: "dr",
        dueDays: inv.dueDays
      }
    };
  });

  return previewData.slice(0, 100);
};

const confirmB2BOutstandingImport = async (workspaceId, companyId, userId, customersData) => {
  const session = await mongoose.startSession();
  let successful = 0;
  let failed = 0;
  let errors = [];

  try {
    session.startTransaction();
    
    // We will do customer creation / lookup and invoice creation one by one for simplicity and correctness
    for (const data of customersData) {
      try {
        // 1. Find or create customer
        let customer = await Customer.findOne({
          workspaceId,
          companyId,
          name: { $regex: new RegExp("^" + data.name + "$", "i") },
          customerType: "b2b",
          isDeleted: false
        }, { session });

        if (!customer) {
          
          const [newCustomer] = await Customer.create([{ 
            workspaceId,
            companyId,
            customerType: "b2b",
            name: data.name,
            
            status: CUSTOMER_STATUS.ACTIVE,
            createdBy: userId,
            openingBalance: 0,
            openingBalanceType: "dr"
           }], { session });
          customer = newCustomer;
        }

        // 2. Accumulate outstanding balance on the customer
        customer.openingBalance = (customer.openingBalance || 0) + data.openingBalance;
        customer.openingBalanceType = "dr";
        await customer.save({ session });

        // 3. Create historical Sale Bill (Credit)
        const invoiceData = {
          workspaceId,
          companyId,
          customerId: customer._id,
          invoiceNo: data.invoiceNumber,
          date: new Date(data.invoiceDate),
          paymentMethod: "Credit",
          status: data.openingBalance > 0 && data.openingBalance < data.billAmount ? "Partial" : (data.openingBalance > 0 ? "Credit" : "Paid"),
          grandTotal: data.billAmount,
          subtotal: data.billAmount, // adding subtotal for completeness
          createdBy: userId,
          items: [{
             itemName: "Historical Outstanding",
             qty: 1,
             rate: data.billAmount,
             amount: data.billAmount
          }]
        };
        
        const invoice = new SalesInvoice(invoiceData);
        await invoice.save({ session });
        
        successful++;
      } catch (err) {
        failed++;
        errors.push(`Row with Invoice ${data.invoiceNumber}: ${err.message}`);
      }
    }

    if (failed > 0 && successful === 0) {
      throw new Error("All rows failed to import: " + errors.join("; "));
    }

    await session.commitTransaction();
    return { successful, failed, errors };
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(500, "Import confirmation failed: " + error.message);
  } finally {
    session.endSession();
  }
};

export default {
  previewImport,
  confirmImport,
  previewB2BOutstandingImport,
  confirmB2BOutstandingImport,
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  getCustomerPayments,
};
