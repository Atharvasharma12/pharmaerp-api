import mongoose from "mongoose";
import JournalVoucher from "../models/journalVoucher.model.js";

const findVoucherById = async (voucherId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(voucherId)) {
    return null;
  }
  return JournalVoucher.findById(voucherId)
    .populate("createdBy", "name email")
    .populate("postedBy", "name email")
    .session(options.session || null);
};

const findVoucherByIdCompanyAndWorkspace = async (
  voucherId,
  companyId,
  workspaceId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(voucherId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return JournalVoucher.findOne({
    _id: voucherId,
    companyId,
    workspaceId,
  })
    .populate("createdBy", "name email")
    .populate("postedBy", "name email")
    .session(options.session || null);
};

const createVoucher = async (payload, options = {}) => {
  const [voucher] = await JournalVoucher.create([payload], {
    session: options.session || null,
  });
  return voucher;
};

const getVouchers = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { vouchers: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
  };

  if (filters.voucherType) {
    query.voucherType = filters.voucherType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.voucherDate = {};
    if (filters.startDate) {
      query.voucherDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.voucherDate.$lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { voucherNumber: searchRegex },
      { referenceNumber: searchRegex },
      { narration: searchRegex },
    ];
  }

  const sort = options.sort || { voucherDate: -1, voucherNumber: -1 };

  if (options.all === true) {
    const vouchers = await JournalVoucher.find(query)
      .populate("createdBy", "name email")
      .populate("postedBy", "name email")
      .sort(sort);
    return { vouchers, total: vouchers.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [vouchers, total] = await Promise.all([
    JournalVoucher.find(query)
      .populate("createdBy", "name email")
      .populate("postedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    JournalVoucher.countDocuments(query),
  ]);

  return { vouchers, total, page, limit };
};

const deleteVoucherById = async (voucherId, companyId, workspaceId, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(voucherId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return JournalVoucher.findOneAndDelete(
    {
      _id: voucherId,
      companyId,
      workspaceId,
      status: "DRAFT", // Safe constraint: can only delete drafts
    },
    {
      session: options.session || null,
    }
  );
};

export default {
  findVoucherById,
  findVoucherByIdCompanyAndWorkspace,
  createVoucher,
  getVouchers,
  deleteVoucherById,
};
