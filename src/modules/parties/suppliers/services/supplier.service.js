import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import supplierRepository from "../repositories/supplier.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import { SUPPLIER_STATUS } from "../constants/supplier.constant.js";
import ledgerService from "../../../finance/ledger/services/ledger.service.js";
import ledgerRepository from "../../../finance/ledger/repositories/ledger.repository.js";
import purchaseBillRepository from "../../../catalog/purchase-bills/repositories/purchaseBill.repository.js";
import * as xlsx from "xlsx";

const createSupplier = async (workspaceId, companyId, userId, payload) => {
  const {
    branchId,
    supplierCode,
    supplierType,
    businessName,
    contactPerson,
    mobile,
    alternateMobile,
    email,
    gstNumber,
    panNumber,
    drugLicenseNumber,
    address,
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

  if (supplierCode) {
    const existing = await supplierRepository.findSupplierByCode(supplierCode);
    if (existing) {
      throw new ApiError(400, "Supplier with this code already exists");
    }
  }

  
  const mongoose = (await import('mongoose')).default;
  const AccountGroup = mongoose.model("AccountGroup");
  const Account = mongoose.model("Account");

  let creditorsGroup = await AccountGroup.findOne({ workspaceId, companyId, groupCode: "SUNDRY_CREDITORS" }) 
                    || await AccountGroup.findOne({ workspaceId, companyId, groupName: "Sundry Creditors" });
  if (!creditorsGroup) {
      const currentLiabilities = await AccountGroup.findOne({ workspaceId, companyId, groupCode: "CURRENT_LIABILITIES" }) || await AccountGroup.findOne({ workspaceId, companyId, groupName: /Current Liabilit/i });
      if (currentLiabilities) {
          creditorsGroup = await AccountGroup.create({
              workspaceId,
              companyId,
              groupName: "Sundry Creditors",
              groupCode: "SUNDRY_CREDITORS",
              parentGroupId: currentLiabilities._id,
              isSystemGroup: true,
              createdBy: userId,
          });
      }
  }

  const accCode = supplierCode ? `SUP-${supplierCode}` : `SUP-${Date.now()}`;
  const ledgerAccount = await Account.create({
    workspaceId,
    companyId,
    accountCode: accCode,
    accountName: `${businessName} - Supplier`,
    accountGroupId: creditorsGroup?._id,
    accountNature: "LIABILITY",
    accountCategory: "SUPPLIER",
    openingBalance: openingBalance || 0,
    openingBalanceType: openingBalanceType || "cr",
    status: "active",
    isSystemAccount: false,
    createdBy: userId,
  });

  const supplier = await supplierRepository.createSupplier({
    workspaceId,
    companyId,
    branchId: branchId || null,
    supplierCode,
    supplierType,
    businessName,
    contactPerson,
    mobile,
    alternateMobile,
    email,
    gstNumber,
    panNumber,
    drugLicenseNumber,
    address,
    creditDays,
    openingBalance,
    openingBalanceType,
    notes,
    status,
    ledgerAccountId: ledgerAccount._id,
    createdBy: userId,
  });


  return supplier.toSafeObject();
};

const getSuppliers = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, ...filters } = query;
  const [result, stats] = await Promise.all([
    supplierRepository.getSuppliers(
      workspaceId,
      companyId,
      filters,
      { page, limit, sort },
    ),
    supplierRepository.getSuppliersStats(
      workspaceId,
      companyId,
      filters
    )
  ]);

  const populatedSuppliers = await Promise.all(
    result.suppliers.map(async (s) => {
      const obj = s.toSafeObject();
      try {
        const outstanding = await getSupplierOutstanding(s._id, companyId, workspaceId);
        return {
          ...obj,
          outstandingAmount: outstanding.outstandingAmount,
          balanceType: outstanding.balanceType
        };
      } catch (err) {
        return { ...obj, outstandingAmount: 0, balanceType: "cr" };
      }
    })
  );

  return {
    suppliers: populatedSuppliers,
    total: result.total,
    page: result.page,
    limit: result.limit,
    stats,
  };
};

const getSupplierById = async (supplierId, companyId, workspaceId) => {
  const supplier = await supplierRepository.findSupplierByIdCompanyAndWorkspace(
    supplierId,
    companyId,
    workspaceId,
  );

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return supplier.toSafeObject();
};

const updateSupplier = async (
  supplierId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const supplier = await supplierRepository.findSupplierByIdCompanyAndWorkspace(
    supplierId,
    companyId,
    workspaceId,
  );

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
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

  if (payload.supplierCode && payload.supplierCode !== supplier.supplierCode) {
    const existing = await supplierRepository.findSupplierByCode(
      payload.supplierCode,
    );
    if (existing && existing._id.toString() !== supplier._id.toString()) {
      throw new ApiError(400, "Supplier with this code already exists");
    }
  }

  const allowedFields = [
    "branchId",
    "supplierCode",
    "supplierType",
    "businessName",
    "contactPerson",
    "mobile",
    "alternateMobile",
    "email",
    "gstNumber",
    "panNumber",
    "drugLicenseNumber",
    "address",
    "creditDays",
    "openingBalance",
    "openingBalanceType",
    "notes",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      supplier[field] = payload[field];
    }
  });

  await supplierRepository.saveSupplier(supplier);

  return supplier.toSafeObject();
};

const deleteSupplier = async (supplierId, companyId, workspaceId, userId) => {
  const supplier = await supplierRepository.deleteSupplierById(
    supplierId,
    companyId,
    workspaceId,
    userId,
  );

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return { success: true };
};

/*
|--------------------------------------------------------------------------
| Additional Financial / Purchases / Outstanding Stubs
|--------------------------------------------------------------------------
*/

const getSupplierLedger = async (supplierId, companyId, workspaceId, query = {}) => {
  console.log("Fetching ledger for supplier:", supplierId);
  const supplier = await getSupplierById(supplierId, companyId, workspaceId);

  if (!supplier.ledgerAccountId) {
    console.log("Supplier has no ledgerAccountId!", supplierId);
    return { entries: [], total: 0, page: 1, limit: 20, meta: { totalDebit: 0, totalCredit: 0 } };
  }

  console.log("Supplier ledgerAccountId:", supplier.ledgerAccountId);
  
  const ledgerData = await ledgerService.getLedger(workspaceId, companyId, {
    accountId: supplier.ledgerAccountId,
    ...query,
  });

  console.log("Ledger data fetched successfully, total entries:", ledgerData?.total);
  return ledgerData;
};

import Ledger from "../../../finance/ledger/models/ledger.model.js";

const getSupplierOutstanding = async (supplierId, companyId, workspaceId) => {
  const supplier = await getSupplierById(supplierId, companyId, workspaceId);

  if (!supplier.ledgerAccountId) {
    return {
      outstandingAmount: supplier.openingBalance || 0,
      balanceType: supplier.openingBalanceType || "cr",
    };
  }

  const aggregate = await Ledger.aggregate([
    {
      $match: {
        accountId: supplier.ledgerAccountId,
        companyId: new mongoose.Types.ObjectId(companyId),
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
      },
    },
  ]);

  const transDebit = aggregate[0]?.totalDebit || 0;
  const transCredit = aggregate[0]?.totalCredit || 0;

  const opDebit = supplier.openingBalanceType === "dr" ? (supplier.openingBalance || 0) : 0;
  const opCredit = supplier.openingBalanceType === "cr" ? (supplier.openingBalance || 0) : 0;

  const totalDebit = transDebit + opDebit;
  const totalCredit = transCredit + opCredit;

  let amt = 0;
  let type = "cr";

  if (totalCredit >= totalDebit) {
    amt = totalCredit - totalDebit;
    type = "cr";
  } else {
    amt = totalDebit - totalCredit;
    type = "dr";
  }

  return {
    outstandingAmount: amt,
    balanceType: type,
  };
};

const getSupplierPurchases = async (supplierId, companyId, workspaceId, query = {}) => {
  await getSupplierById(supplierId, companyId, workspaceId); // Validate supplier

  const { page, limit, sort, ...filters } = query;
  filters.supplierId = supplierId;

  const result = await purchaseBillRepository.getPurchaseBills(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort }
  );

  return result;
};

const getSupplierPayments = async (supplierId, companyId, workspaceId) => {
  await getSupplierById(supplierId, companyId, workspaceId);
  return []; // Will implement when Payment module is ready
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
      (rowStr.includes("name") || rowStr.includes("ledger") || rowStr.includes("party")) &&
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

  const existingSuppliers = await supplierRepository.getSuppliers(
    workspaceId,
    companyId,
    {},
    { limit: 100000 }
  );
  
  const existingMobilePhones = new Set(existingSuppliers.suppliers.map(s => s.mobile).filter(Boolean));
  const existingEmails = new Set(existingSuppliers.suppliers.map(s => s.email).filter(Boolean));
  const existingGSTs = new Set(existingSuppliers.suppliers.map(s => s.gstNumber).filter(Boolean));
  const existingPANs = new Set(existingSuppliers.suppliers.map(s => s.panNumber).filter(Boolean));
  const existingNames = new Set(existingSuppliers.suppliers.map(s => s.businessName.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean));

  const parsedRows = data.map((lowerRow, index) => {
    const businessName = String(lowerRow["name"] || lowerRow["ledger name"] || lowerRow["party name"] || lowerRow["ledger"] || "").trim();
    
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
    const gstNumber = String(lowerRow["gstin"] || lowerRow["gstin no."] || lowerRow["gstin no"] || lowerRow["gst"] || lowerRow["tin"] || "").trim();
    const panNumber = String(lowerRow["pan"] || lowerRow["panno"] || "").trim();
    const contactPerson = String(lowerRow["contact"] || lowerRow["contact person"] || "").trim();
    
    const addressLine1 = String(lowerRow["address1"] || lowerRow["address"] || lowerRow["address & details"] || "").trim();
    const addressLine2 = [
      String(lowerRow["address2"] || ""),
      String(lowerRow["address3"] || "")
    ].filter(Boolean).map(s => s.trim()).join(", ");
    const city = String(lowerRow["city"] || "").trim();
    const pincode = String(lowerRow["pin"] || lowerRow["pincode"] || "").trim();
    
    // License
    const drugLicenseNumber = String(lowerRow["licence"] || lowerRow["dl no"] || "").trim();

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
    if (!businessName || normalizedName === "ledger name" || normalizedName === "name" || normalizedName === "party name" || normalizedName === "ledger") {
      return null;
    }

    if (!businessName) {
      errors.push("Business Name is required");
    } else if (existingNames.has(normalizedName)) {
      errors.push("Supplier with a similar name already exists");
    }
    
    if (mobile) {
      if (!/^[6-9][0-9]{9}$/.test(mobile)) errors.push("Invalid mobile number format");
      else if (existingMobilePhones.has(mobile)) errors.push("Mobile number already exists in workspace");
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
      else if (existingEmails.has(email)) errors.push("Email already exists in workspace");
    }

    let state = null;
    if (gstNumber) {
      // Relaxed validation to allow 12-character legacy GSTs (State Code + PAN)
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(gstNumber)) errors.push("Invalid GST Number format");
      else if (existingGSTs.has(gstNumber)) errors.push("GST Number already exists in workspace");
      else {
        const stateCode = gstNumber.substring(0, 2);
        if (GST_STATE_CODES[stateCode]) {
          state = GST_STATE_CODES[stateCode];
        }
      }
    }

    if (panNumber) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) errors.push("Invalid PAN Number format");
      else if (existingPANs.has(panNumber)) errors.push("PAN Number already exists in workspace");
    }

    return {
      rowNumber: index + headerRowIndex + 2, // Accounting for header and 0-indexing
      data: {
        businessName,
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

const confirmImport = async (workspaceId, companyId, userId, suppliersData) => {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    const payloads = suppliersData.map(supplierData => ({
      ...supplierData,
      workspaceId,
      companyId,
      createdBy: userId,
    }));

    // Use bulk insertion
    await supplierRepository.insertManySuppliers(payloads);
    
    results.successful = payloads.length;
  } catch (error) {
    if (error.writeErrors) {
      // If some failed in unordered bulk op
      results.successful = suppliersData.length - error.writeErrors.length;
      results.failed = error.writeErrors.length;
      error.writeErrors.forEach(err => {
        results.errors.push(`Failed for index ${err.index}: ${err.errmsg}`);
      });
    } else {
      results.failed = suppliersData.length;
      results.errors.push(`Bulk import failed: ${error.message}`);
    }
  }

  return results;
};

export default {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
  getSupplierOutstanding,
  getSupplierPurchases,
  getSupplierPayments,
  previewImport,
  confirmImport,
};
