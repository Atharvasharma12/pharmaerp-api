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

const buildSupplierQuery = (workspaceId, companyId, filters) => {
  const query = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
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
  
  return query;
};

const getSuppliers = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { suppliers: [], total: 0, page: 1, limit: 20 };
  }

  const query = buildSupplierQuery(workspaceId, companyId, filters);

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

const getSuppliersStats = async (workspaceId, companyId, filters = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { total: 0, active: 0, inactive: 0, blocked: 0, totalCr: 0, totalDr: 0, netRunning: 0, runningType: "Cr" };
  }
  
  const query = buildSupplierQuery(workspaceId, companyId, filters);

  const result = await Supplier.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "ledgers",
        let: { account_id: "$ledgerAccountId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$accountId", "$$account_id"] } } },
          { $sort: { voucherDate: -1, createdAt: -1 } },
          { $limit: 1 }
        ],
        as: "lastLedgerEntry"
      }
    },
    {
      $unwind: { path: "$lastLedgerEntry", preserveNullAndEmptyArrays: true }
    },
    {
      $project: {
        status: 1,
        balance: {
          $cond: {
            if: { $ifNull: ["$lastLedgerEntry._id", false] },
            then: { $abs: { $ifNull: ["$lastLedgerEntry.runningBalance", 0] } },
            else: { $ifNull: ["$openingBalance", 0] }
          }
        },
        balanceType: {
          $cond: {
            if: { $ifNull: ["$lastLedgerEntry._id", false] },
            then: { $cond: [{ $gte: [{ $ifNull: ["$lastLedgerEntry.runningBalance", 0] }, 0] }, "cr", "dr"] },
            else: { $toLower: { $ifNull: ["$openingBalanceType", "cr"] } }
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "inactive"] }, 1, 0] } },
        blocked: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "blocked"] }, 1, 0] } },
        totalCr: { $sum: { $cond: [{ $eq: ["$balanceType", "cr"] }, "$balance", 0] } },
        totalDr: { $sum: { $cond: [{ $eq: ["$balanceType", "dr"] }, "$balance", 0] } }
      }
    }
  ]);

  if (result.length > 0) {
    const data = result[0];
    const netRunning = data.totalCr - data.totalDr;
    return {
      total: data.total,
      active: data.active,
      inactive: data.inactive,
      blocked: data.blocked,
      totalCr: data.totalCr,
      totalDr: data.totalDr,
      netRunning: Math.abs(netRunning),
      runningType: netRunning >= 0 ? "Cr" : "Dr"
    };
  }

  return {
    total: 0,
    active: 0,
    inactive: 0,
    blocked: 0,
    totalCr: 0,
    totalDr: 0,
    netRunning: 0,
    runningType: "Cr"
  };
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


const insertManySuppliers = async (payloads) => {
  return Supplier.insertMany(payloads, { ordered: false });
};

export default {
  insertManySuppliers,
  findSupplierById,
  findSupplierByIdCompanyAndWorkspace,
  findSupplierByCode,
  createSupplier,
  saveSupplier,
  getSuppliers,
  getSuppliersStats,
  deleteSupplierById,
};
