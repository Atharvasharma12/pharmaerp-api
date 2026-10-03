import mongoose from "mongoose";
import GstLedger from "../models/gstLedger.model.js";

const createGstLedgerEntry = async (payload, options = {}) => {
  const [entry] = await GstLedger.create([payload], {
    session: options.session || null,
  });
  return entry;
};

const deleteGstLedgerEntriesByVoucherId = async (voucherId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(voucherId)) {
    return null;
  }

  return GstLedger.deleteMany(
    { voucherId },
    {
      session: options.session || null,
    }
  );
};

const getGstLedgerEntries = async (
  workspaceId,
  companyId,
  gstType,
  filters = {},
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { entries: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
    gstType,
  };

  if (filters.startDate || filters.endDate) {
    query.voucherDate = {};
    if (filters.startDate) {
      query.voucherDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.voucherDate.$lte = new Date(filters.endDate);
    }
  }

  // Optional: Filter by specific party if needed
  if (filters.partyId && mongoose.Types.ObjectId.isValid(filters.partyId)) {
    query.partyId = filters.partyId;
  }

  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [{ voucherNumber: searchRegex }, { narration: searchRegex }];
  }

  const sort = options.sort || { voucherDate: -1, createdAt: -1 };

  if (options.all === true) {
    const entries = await GstLedger.find(query)
      .sort(sort)
      .session(options.session || null);
    return { entries, total: entries.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    GstLedger.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    GstLedger.countDocuments(query).session(options.session || null),
  ]);

  return { entries, total, page, limit };
};

export default {
  createGstLedgerEntry,
  deleteGstLedgerEntriesByVoucherId,
  getGstLedgerEntries,
};
