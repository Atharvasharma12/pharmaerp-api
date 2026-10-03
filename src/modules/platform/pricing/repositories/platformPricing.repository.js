import mongoose from "mongoose";

import PlatformPricing from "../models/platformPricing.model.js";

const findByGlobalProductId = async (globalProductId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(globalProductId)) {
    return null;
  }

  return PlatformPricing.findOne({
    globalProductId,
    isDeleted: false,
  }).select(options.select || "");
};

const findById = async (pricingId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(pricingId)) {
    return null;
  }

  let query = PlatformPricing.findOne({ _id: pricingId, isDeleted: false });

  if (options.populate) {
    query = query.populate(options.populate);
  }

  return query.select(options.select || "");
};

const createPricing = async (payload) => {
  return PlatformPricing.create(payload);
};

const savePricing = async (pricing) => {
  return pricing.save();
};

const getAllPricing = async (filters = {}, options = {}) => {
  const query = { isDeleted: false };

  if (filters.status) {
    query.status = filters.status;
  }

  let dbQuery = PlatformPricing.find(query).sort(
    options.sort || { createdAt: -1 },
  );

  if (options.populate) {
    dbQuery = dbQuery.populate(options.populate);
  }

  return dbQuery.select(options.select || "");
};

// Bulk fetch pricing for a list of globalProductIds (used by marketplace/pricing)
const findManyByGlobalProductIds = async (globalProductIds) => {
  const validIds = globalProductIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );

  if (!validIds.length) return [];

  return PlatformPricing.find({
    globalProductId: { $in: validIds },
    isDeleted: false,
    status: "ACTIVE",
  }).select("globalProductId mrp customerPrice partnerSettlementPrice deliveryCharge status updatedAt");
};

const softDelete = async (pricingId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(pricingId)) {
    return null;
  }

  return PlatformPricing.findOneAndUpdate(
    { _id: pricingId, isDeleted: false },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      status: "INACTIVE",
    },
    { new: true },
  );
};

// Paginated catalog of all active platform-priced products with product details
// Used by partners to browse what's available before enabling in their store
const getPricingCatalog = async (filters = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;

  // Base match — only active, non-deleted pricing records
  const baseMatch = { isDeleted: false, status: "ACTIVE" };

  const pipeline = [
    { $match: baseMatch },
    {
      $lookup: {
        from: "globalproducts",
        localField: "globalProductId",
        foreignField: "_id",
        as: "globalProductId",
      },
    },
    { $unwind: "$globalProductId" },
    // Only include active global products
    { $match: { "globalProductId.isDeleted": false } },
  ];

  // Text search across product name, code, marketer
  if (filters.search) {
    pipeline.push({
      $match: {
        $or: [
          { "globalProductId.name": { $regex: filters.search, $options: "i" } },
          {
            "globalProductId.globalProductCode": {
              $regex: filters.search,
              $options: "i",
            },
          },
          {
            "globalProductId.marketer": {
              $regex: filters.search,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  // Filter by product type
  if (filters.productType) {
    pipeline.push({
      $match: { "globalProductId.productType": filters.productType },
    });
  }

  // Count total (before pagination)
  const countPipeline = [...pipeline, { $count: "total" }];

  // Projection — expose only the fields partners need
  pipeline.push(
    { $sort: { "globalProductId.name": 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        globalProductId: {
          _id: 1,
          name: 1,
          globalProductCode: 1,
          marketer: 1,
          productType: 1,
          productForm: 1,
          pack: 1,
          qty: 1,
          imageUrl: 1,
        },
        mrp: 1,
        // customerPrice intentionally excluded — partners see only settlement price
        partnerSettlementPrice: 1,
        deliveryCharge: 1,
        status: 1,
        updatedAt: 1,
      },
    },
  );

  const [results, countResult] = await Promise.all([
    PlatformPricing.aggregate(pipeline),
    PlatformPricing.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;

  return { results, total, page, limit };
};

export default {
  findByGlobalProductId,
  findById,
  createPricing,
  savePricing,
  getAllPricing,
  findManyByGlobalProductIds,
  softDelete,
  getPricingCatalog,
};

