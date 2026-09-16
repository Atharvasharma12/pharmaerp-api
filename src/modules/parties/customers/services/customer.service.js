import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import customerRepository from "../repositories/customer.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import { CUSTOMER_STATUS } from "../constants/customer.constant.js";
import Batch from "../../../catalog/products/models/batch.model.js";
import ProductFacility from "../../../catalog/products/models/productFacility.model.js";

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
    createdBy: userId,
  });

  return customer.toSafeObject();
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

const getCustomerLedger = async (customerId, companyId, workspaceId) => {
  const customer = await getCustomerById(customerId, companyId, workspaceId);

  const ledger = [];
  if (customer.openingBalance > 0) {
    ledger.push({
      date: customer.createdAt,
      description: "Opening Balance",
      voucherType: "OPENING_BALANCE",
      debit: customer.openingBalanceType === "dr" ? customer.openingBalance : 0,
      credit:
        customer.openingBalanceType === "cr" ? customer.openingBalance : 0,
      balance: customer.openingBalance,
      balanceType: customer.openingBalanceType,
    });
  }

  return ledger;
};

const getCustomerOutstanding = async (customerId, companyId, workspaceId) => {
  const customer = await getCustomerById(customerId, companyId, workspaceId);

  return {
    outstandingAmount: customer.openingBalance || 0,
    balanceType: customer.openingBalanceType || "dr",
  };
};

const getCustomerSales = async (customerId, companyId, workspaceId, branchId = null) => {
  const customer = await customerRepository.findCustomerByIdCompanyAndWorkspace(
    customerId,
    companyId,
    workspaceId,
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const allSales = customer.salesHistory || [];
  if (branchId) {
    return allSales.filter(
      (s) => !s.branchId || String(s.branchId) === String(branchId)
    );
  }
  return allSales;
};

const recordCustomerSale = async (customerId, saleData, companyId, workspaceId, user = null) => {
  const customer = await customerRepository.findCustomerById(customerId, companyId, workspaceId);

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  if (!Array.isArray(customer.salesHistory)) {
    customer.salesHistory = [];
  }

  const userId = user?._id || user?.id || null;
  const userName = user?.name || user?.displayName || user?.fullName || (user?.email ? user.email.split("@")[0] : "System User");
  const userEmail = user?.email || null;

  let resolvedBranchId = saleData.branchId || customer.branchId || null;

  if (!resolvedBranchId && companyId) {
    try {
      const activeBranches = await branchRepository.findActiveBranchesByCompany(companyId);
      if (Array.isArray(activeBranches) && activeBranches.length > 0) {
        resolvedBranchId = activeBranches[0]._id;
      }
    } catch (bErr) {
      // Fallback
    }
  }

  const newSale = {
    _id: new mongoose.Types.ObjectId(),
    workspaceId: workspaceId || customer.workspaceId,
    companyId: companyId || customer.companyId,
    branchId: resolvedBranchId,
    invoiceNo: saleData.invoiceNo || `RET-INV-${Date.now()}`,
    date: saleData.date || new Date(),
    billingMode: saleData.billingMode || "B2C",
    subtotal: saleData.subtotal || 0,
    discount: saleData.discount || 0,
    tax: saleData.tax || 0,
    grandTotal: saleData.grandTotal || 0,
    paymentMethod: saleData.paymentMethod || "Cash",
    items: saleData.items || [],
    status: "Paid",
    createdBy: userId,
    createdByName: userName,
    createdByEmail: userEmail,
    createdAt: new Date(),
  };

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

  customer.salesHistory.unshift(newSale);
  await customer.save();

  return newSale;
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
  getCustomerSales,
  recordCustomerSale,
  getCustomerPayments,
};
