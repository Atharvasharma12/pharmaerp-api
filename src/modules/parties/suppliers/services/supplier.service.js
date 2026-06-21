import ApiError from "../../../../utils/ApiError.js";
import supplierRepository from "../repositories/supplier.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";
import { SUPPLIER_STATUS } from "../constants/supplier.constant.js";

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
    createdBy: userId,
  });

  return supplier.toSafeObject();
};

const getSuppliers = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, ...filters } = query;
  const result = await supplierRepository.getSuppliers(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort },
  );

  return {
    suppliers: result.suppliers.map((s) => s.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
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

const getSupplierLedger = async (supplierId, companyId, workspaceId) => {
  const supplier = await getSupplierById(supplierId, companyId, workspaceId);

  const ledger = [];
  if (supplier.openingBalance > 0) {
    ledger.push({
      date: supplier.createdAt,
      description: "Opening Balance",
      voucherType: "OPENING_BALANCE",
      debit: supplier.openingBalanceType === "dr" ? supplier.openingBalance : 0,
      credit:
        supplier.openingBalanceType === "cr" ? supplier.openingBalance : 0,
      balance: supplier.openingBalance,
      balanceType: supplier.openingBalanceType,
    });
  }

  return ledger;
};

const getSupplierOutstanding = async (supplierId, companyId, workspaceId) => {
  const supplier = await getSupplierById(supplierId, companyId, workspaceId);

  return {
    outstandingAmount: supplier.openingBalance || 0,
    balanceType: supplier.openingBalanceType || "cr",
  };
};

const getSupplierPurchases = async (supplierId, companyId, workspaceId) => {
  await getSupplierById(supplierId, companyId, workspaceId);
  return [];
};

const getSupplierPayments = async (supplierId, companyId, workspaceId) => {
  await getSupplierById(supplierId, companyId, workspaceId);
  return [];
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
};
