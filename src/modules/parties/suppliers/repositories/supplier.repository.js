import mongoose from "mongoose";
import Supplier from "../models/supplier.model.js";
import { SUPPLIER_STATUS } from "../constants/supplier.constant.js";

const findSupplierById = async (supplierId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    return null;
  }
  return Supplier.findOne({
    _id: supplierId,
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const findSupplierByIdCompanyAndWorkspace = async (
  supplierId,
  companyId,
  workspaceId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(supplierId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Supplier.findOne({
    _id: supplierId,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const findSupplierByCode = async (supplierCode, options = {}) => {
  if (!supplierCode) {
    return null;
  }
  return Supplier.findOne({
    supplierCode: String(supplierCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const createSupplier = async (payload) => {
  return Supplier.create(payload);
};

const saveSupplier = async (supplier) => {
  return supplier.save();
};

const getSuppliers = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { suppliers: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.supplierType) {
    query.supplierType = filters.supplierType;
  }

  if (filters.supplierCode) {
    query.supplierCode = { $regex: new RegExp(filters.supplierCode.trim(), "i") };
  }

  if (filters.gstNumber) {
    query.gstNumber = { $regex: new RegExp(filters.gstNumber.trim(), "i") };
  }

  if (filters.mobile) {
    query.mobile = { $regex: new RegExp(filters.mobile.trim(), "i") };
  }

  if (filters.businessName) {
    query.businessName = { $regex: new RegExp(filters.businessName.trim(), "i") };
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { businessName: searchRegex },
      { mobile: searchRegex },
      { supplierCode: searchRegex },
    ];
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  const [suppliers, total] = await Promise.all([
    Supplier.find(query)
      .populate("branchId", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    Supplier.countDocuments(query),
  ]);

  return { suppliers, total, page, limit };
};

const deleteSupplierById = async (supplierId, companyId, workspaceId, deletedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(supplierId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Supplier.findOneAndUpdate(
    {
      _id: supplierId,
      companyId,
      workspaceId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      status: SUPPLIER_STATUS.INACTIVE,
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export default {
  findSupplierById,
  findSupplierByIdCompanyAndWorkspace,
  findSupplierByCode,
  createSupplier,
  saveSupplier,
  getSuppliers,
  deleteSupplierById,
};
