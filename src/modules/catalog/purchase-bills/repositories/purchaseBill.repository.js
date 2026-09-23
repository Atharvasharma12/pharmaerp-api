import mongoose from "mongoose";
import PurchaseBill from "../models/purchaseBill.model.js";

const createPurchaseBill = async (payload) => {
  return PurchaseBill.create(payload);
};

const findPurchaseBillById = async (billId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(billId)) {
    return null;
  }
  return PurchaseBill.findOne({
    _id: billId,
    isDeleted: false,
  })
    .populate("supplierId", "businessName contactPerson mobile gstNumber")
    .select(options.select || "");
};

const findPurchaseBillByIdAndWorkspace = async (
  billId,
  workspaceId,
  companyId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(billId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return null;
  }

  return PurchaseBill.findOne({
    _id: billId,
    workspaceId,
    companyId,
    isDeleted: false,
  })
    .populate("supplierId", "businessName contactPerson mobile gstNumber")
    .select(options.select || "");
};

const updatePurchaseBill = async (billId, workspaceId, companyId, payload) => {
  return PurchaseBill.findOneAndUpdate(
    { _id: billId, workspaceId, companyId, isDeleted: false },
    { $set: payload },
    { new: true }
  );
};

const getPurchaseBills = async (
  workspaceId,
  companyId,
  filters = {},
  pagination = {}
) => {
  const { page = 1, limit = 25, sort = "-createdAt" } = pagination;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.supplierId) {
    query.supplierId = filters.supplierId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    query.invoiceNo = { $regex: filters.search, $options: "i" };
  }

  const [bills, total] = await Promise.all([
    PurchaseBill.find(query)
      .populate("supplierId", "businessName contactPerson mobile")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    PurchaseBill.countDocuments(query),
  ]);

  return {
    bills,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
};

const softDeletePurchaseBill = async (billId) => {
  return PurchaseBill.findByIdAndUpdate(
    billId,
    { isDeleted: true },
    { new: true }
  );
};

const purchaseBillRepository = {
  createPurchaseBill,
  updatePurchaseBill,
  findPurchaseBillById,
  findPurchaseBillByIdAndWorkspace,
  getPurchaseBills,
  softDeletePurchaseBill,
};

export default purchaseBillRepository;
