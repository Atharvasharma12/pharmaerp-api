import mongoose from "mongoose";
import PaymentQr from "../models/paymentQr.model.js";

const POPULATE_FIELDS = [
  {
    path: "bankAccountId",
    select: "accountName accountNumber ifscCode bankMasterId",
    populate: { path: "bankMasterId", select: "name shortName" },
  },
  { path: "createdBy", select: "name email" },
];

const findPaymentQrById = async (id, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return PaymentQr.findOne({ _id: id, isDeleted: false })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const findPaymentQrByIdCompanyAndWorkspace = async (
  id,
  companyId,
  workspaceId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }
  return PaymentQr.findOne({
    _id: id,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate(POPULATE_FIELDS)
    .session(options.session || null);
};

const findPaymentQrByUpiId = async (companyId, upiId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(companyId)) return null;
  return PaymentQr.findOne({
    companyId,
    upiId: String(upiId).trim().toLowerCase(),
    isDeleted: false,
  }).session(options.session || null);
};

const createPaymentQr = async (payload, options = {}) => {
  const [paymentQr] = await PaymentQr.create([payload], {
    session: options.session || null,
  });
  return paymentQr;
};

const getPaymentQrs = async (
  workspaceId,
  companyId,
  filters = {},
  options = {},
) => {
  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.bankAccountId) query.bankAccountId = filters.bankAccountId;
  if (filters.provider) query.provider = filters.provider;
  if (filters.status) query.status = filters.status;
  if (filters.isPrimary !== undefined) query.isPrimary = filters.isPrimary;

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { upiId: searchRegex },
      { label: searchRegex },
    ];
  }

  const sort = options.sort || { isPrimary: -1, createdAt: -1 };

  if (options.all === true) {
    const paymentQrs = await PaymentQr.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .session(options.session || null);
    return { paymentQrs, total: paymentQrs.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [paymentQrs, total] = await Promise.all([
    PaymentQr.find(query)
      .populate(POPULATE_FIELDS)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    PaymentQr.countDocuments(query).session(options.session || null),
  ]);

  return { paymentQrs, total, page, limit };
};

// Unset isPrimary for all QRs in the company, then set for the specified one
const setPrimaryPaymentQr = async (id, companyId, workspaceId, options = {}) => {
  await PaymentQr.updateMany(
    { companyId, workspaceId, isDeleted: false },
    { $set: { isPrimary: false } },
    { session: options.session || null },
  );
  return PaymentQr.findOneAndUpdate(
    { _id: id, companyId, workspaceId },
    { $set: { isPrimary: true } },
    { new: true, session: options.session || null },
  );
};

export default {
  findPaymentQrById,
  findPaymentQrByIdCompanyAndWorkspace,
  findPaymentQrByUpiId,
  createPaymentQr,
  getPaymentQrs,
  setPrimaryPaymentQr,
};
