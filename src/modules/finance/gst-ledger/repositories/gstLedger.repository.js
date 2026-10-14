import mongoose from "mongoose";
import GstLedger from "../models/gstLedger.model.js";
import calculateGstr1Summary, { deduceGstrGroup } from "../utils/gstr1SummaryCalculator.js";
import { calculateGstr3bSummary } from "../utils/gstr3bSummaryCalculator.js";

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
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
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

  // Filter by specific branch (if "all" or omitted, queries company-wide)
  if (filters.branchId && filters.branchId !== "all" && mongoose.Types.ObjectId.isValid(filters.branchId)) {
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);

    // Find any vouchers for this branch to match legacy entries that don't have branchId stored directly yet
    let voucherIdsForBranch = [];
    try {
      const db = mongoose.connection.db;
      if (db) {
        if (gstType === "GSTR-1") {
          const invoices = await db.collection("invoices").find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            companyId: new mongoose.Types.ObjectId(companyId),
            branchId: targetBranchId,
          }).project({ _id: 1 }).toArray();
          voucherIdsForBranch = invoices.map((inv) => inv._id);
        } else if (gstType === "GSTR-2") {
          const purchaseBills = await db.collection("purchasebills").find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            companyId: new mongoose.Types.ObjectId(companyId),
            branchId: targetBranchId,
          }).project({ _id: 1 }).toArray();
          voucherIdsForBranch = purchaseBills.map((pb) => pb._id);
        }
      }
    } catch (e) {
      console.error("Error looking up vouchers for branch in gstLedger:", e);
    }

    if (voucherIdsForBranch.length > 0) {
      query.$or = [
        { branchId: targetBranchId },
        { voucherId: { $in: voucherIdsForBranch } },
      ];
    } else {
      query.branchId = targetBranchId;
    }
  }

  // Optional: Filter by specific party if needed
  if (filters.partyId && mongoose.Types.ObjectId.isValid(filters.partyId)) {
    query.partyId = new mongoose.Types.ObjectId(filters.partyId);
  }

  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    const searchCondition = [{ voucherNumber: searchRegex }, { narration: searchRegex }];
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: searchCondition },
      ];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
  }

  const sort = options.sort || { voucherDate: -1, createdAt: -1 };

  const calculateEntriesStats = (entriesList, count) => {
    return entriesList.reduce(
      (acc, curr) => {
        const cgst = Number(curr.cgst || 0);
        const sgst = Number(curr.sgst || 0);
        const igst = Number(curr.igst || 0);
        acc.totalTaxable += Number(curr.taxableAmount || 0);
        acc.totalCgst += cgst;
        acc.totalSgst += sgst;
        acc.totalIgst += igst;
        acc.totalGst += cgst + sgst + igst;
        acc.totalAmount += Number(curr.totalAmount || 0);
        return acc;
      },
      {
        totalTaxable: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalGst: 0,
        totalAmount: 0,
        count: count !== undefined ? count : entriesList.length,
      }
    );
  };

  if (options.all === true) {
    const entries = await GstLedger.find(query)
      .populate({ path: "branchId", select: "name code", strictPopulate: false })
      .sort(sort)
      .session(options.session || null);
    const stats = calculateEntriesStats(entries, entries.length);
    return { entries, total: entries.length, stats };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 10));
  const skip = (page - 1) * limit;

  const [entries, total, aggStats] = await Promise.all([
    GstLedger.find(query)
      .populate({ path: "branchId", select: "name code", strictPopulate: false })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    GstLedger.countDocuments(query).session(options.session || null),
    GstLedger.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: "$taxableAmount" },
          totalCgst: { $sum: "$cgst" },
          totalSgst: { $sum: "$sgst" },
          totalIgst: { $sum: "$igst" },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ])
      .session(options.session || null)
      .catch(() => []),
  ]);

  const rawStat = (aggStats && aggStats[0]) || {};
  const cgst = Number(rawStat.totalCgst || 0);
  const sgst = Number(rawStat.totalSgst || 0);
  const igst = Number(rawStat.totalIgst || 0);
  const stats = {
    totalTaxable: Number(rawStat.totalTaxable || 0),
    totalCgst: cgst,
    totalSgst: sgst,
    totalIgst: igst,
    totalGst: cgst + sgst + igst,
    totalAmount: Number(rawStat.totalAmount || 0),
    count: total,
  };

  // Ensure entries have groupDescription populated and backfilled
  entries.forEach((entry) => {
    if (!entry.groupDescription) {
      entry.groupDescription = deduceGstrGroup(entry);
      GstLedger.updateOne(
        { _id: entry._id, $or: [{ groupDescription: null }, { groupDescription: { $exists: false } }, { groupDescription: "" }] },
        { $set: { groupDescription: entry.groupDescription } }
      ).exec().catch(() => {});
    }
  });

  // Opportunistic background backfill for any unassigned legacy records
  if (query.workspaceId && query.companyId) {
    GstLedger.find({
      workspaceId: query.workspaceId,
      companyId: query.companyId,
      $or: [{ groupDescription: null }, { groupDescription: { $exists: false } }, { groupDescription: "" }],
    })
      .limit(100)
      .then((docs) => {
        if (docs && docs.length > 0) {
          docs.forEach((doc) => {
            const group = deduceGstrGroup(doc);
            GstLedger.updateOne({ _id: doc._id }, { $set: { groupDescription: group } }).exec().catch(() => {});
          });
        }
      })
      .catch(() => {});
  }

  return { entries, total, stats, page, limit };
};

const getGstr1Summary = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { groups: [], totalRow: {}, localSummary: {}, centralSummary: {} };
  }

  const query = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
    gstType: "GSTR-1",
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

  if (filters.branchId && filters.branchId !== "all" && mongoose.Types.ObjectId.isValid(filters.branchId)) {
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);
    let voucherIdsForBranch = [];
    try {
      const db = mongoose.connection.db;
      if (db) {
        const invoices = await db.collection("invoices").find({
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          companyId: new mongoose.Types.ObjectId(companyId),
          branchId: targetBranchId,
        }).project({ _id: 1 }).toArray();
        voucherIdsForBranch = invoices.map((inv) => inv._id);
      }
    } catch (e) {
      console.error("Error looking up vouchers for branch in getGstr1Summary:", e);
    }

    if (voucherIdsForBranch.length > 0) {
      query.$or = [
        { branchId: targetBranchId },
        { voucherId: { $in: voucherIdsForBranch } },
      ];
    } else {
      query.branchId = targetBranchId;
    }
  }

  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    const searchCondition = [{ voucherNumber: searchRegex }, { narration: searchRegex }];
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: searchCondition },
      ];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
  }

  const entries = await GstLedger.find(query)
    .populate({ path: "partyId", select: "name gstNumber" })
    .lean();

  entries.forEach((entry) => {
    if (!entry.groupDescription) {
      entry.groupDescription = deduceGstrGroup(entry);
      GstLedger.updateOne(
        { _id: entry._id, $or: [{ groupDescription: null }, { groupDescription: { $exists: false } }, { groupDescription: "" }] },
        { $set: { groupDescription: entry.groupDescription } }
      ).exec().catch(() => {});
    }
  });

  return calculateGstr1Summary(entries, {
    companyGstin: options.companyGstin || "",
    b2cLargeThreshold: 250000,
  });
};

const getGstr3bSummary = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return calculateGstr3bSummary([], []);
  }

  const baseQuery = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    companyId: new mongoose.Types.ObjectId(companyId),
  };

  if (filters.startDate || filters.endDate) {
    baseQuery.voucherDate = {};
    if (filters.startDate) {
      baseQuery.voucherDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      baseQuery.voucherDate.$lte = new Date(filters.endDate);
    }
  }

  if (filters.branchId && filters.branchId !== "all" && mongoose.Types.ObjectId.isValid(filters.branchId)) {
    const targetBranchId = new mongoose.Types.ObjectId(filters.branchId);
    let voucherIdsForBranch = [];
    try {
      const db = mongoose.connection.db;
      if (db) {
        const invoices = await db.collection("invoices").find({
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          companyId: new mongoose.Types.ObjectId(companyId),
          branchId: targetBranchId,
        }).project({ _id: 1 }).toArray();
        voucherIdsForBranch = invoices.map((inv) => inv._id);
      }
    } catch (e) {
      console.error("Error looking up vouchers for branch in getGstr3bSummary:", e);
    }

    if (voucherIdsForBranch.length > 0) {
      baseQuery.$or = [
        { branchId: targetBranchId },
        { voucherId: { $in: voucherIdsForBranch } },
      ];
    } else {
      baseQuery.branchId = targetBranchId;
    }
  }

  const [gstr1Entries, gstr2Entries] = await Promise.all([
    GstLedger.find({ ...baseQuery, gstType: "GSTR-1" })
      .populate({ path: "partyId", select: "name gstNumber" })
      .lean(),
    GstLedger.find({ ...baseQuery, gstType: "GSTR-2" })
      .populate({ path: "partyId", select: "name gstNumber" })
      .lean(),
  ]);

  return calculateGstr3bSummary(gstr1Entries, gstr2Entries, options);
};

export default {
  createGstLedgerEntry,
  deleteGstLedgerEntriesByVoucherId,
  getGstLedgerEntries,
  getGstr1Summary,
  getGstr3bSummary,
};
