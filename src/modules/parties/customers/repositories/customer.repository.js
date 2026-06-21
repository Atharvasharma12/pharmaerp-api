import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import { CUSTOMER_STATUS } from "../constants/customer.constant.js";

const findCustomerById = async (customerId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return null;
  }
  return Customer.findOne({
    _id: customerId,
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const findCustomerByIdCompanyAndWorkspace = async (
  customerId,
  companyId,
  workspaceId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(customerId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Customer.findOne({
    _id: customerId,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const findCustomerByCode = async (customerCode, options = {}) => {
  if (!customerCode) {
    return null;
  }
  return Customer.findOne({
    customerCode: String(customerCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .populate("branchId", "name")
    .select(options.select || "");
};

const createCustomer = async (payload) => {
  return Customer.create(payload);
};

const saveCustomer = async (customer) => {
  return customer.save();
};

const getCustomers = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { customers: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.customerType) {
    query.customerType = filters.customerType;
  }

  if (filters.customerCode) {
    query.customerCode = { $regex: new RegExp(filters.customerCode.trim(), "i") };
  }

  if (filters.gstNumber) {
    query.gstNumber = { $regex: new RegExp(filters.gstNumber.trim(), "i") };
  }

  if (filters.mobile) {
    query.mobile = { $regex: new RegExp(filters.mobile.trim(), "i") };
  }

  if (filters.name) {
    query.name = { $regex: new RegExp(filters.name.trim(), "i") };
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { name: searchRegex },
      { mobile: searchRegex },
      { customerCode: searchRegex },
    ];
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .populate("branchId", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    Customer.countDocuments(query),
  ]);

  return { customers, total, page, limit };
};

const deleteCustomerById = async (customerId, companyId, workspaceId, deletedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(customerId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Customer.findOneAndUpdate(
    {
      _id: customerId,
      companyId,
      workspaceId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      status: CUSTOMER_STATUS.INACTIVE,
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
  findCustomerById,
  findCustomerByIdCompanyAndWorkspace,
  findCustomerByCode,
  createCustomer,
  saveCustomer,
  getCustomers,
  deleteCustomerById,
};
