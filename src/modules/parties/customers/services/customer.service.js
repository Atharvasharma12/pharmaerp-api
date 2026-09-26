import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import customerRepository from "../repositories/customer.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import gstLedgerRepository from "../../../finance/gst-ledger/repositories/gstLedger.repository.js";
import financialPeriodRepository from "../../../finance/financial-periods/repositories/financialPeriod.repository.js";
import { CUSTOMER_STATUS } from "../constants/customer.constant.js";
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
    customers: result.customers.map((c) => c.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
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

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  getCustomerPayments,
};
