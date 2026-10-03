import ApiError from "../../../../utils/ApiError.js";

import platformPricingRepository from "../repositories/platformPricing.repository.js";

import { PLATFORM_PRICING_STATUS } from "../constants/platformPricing.constant.js";

const getPlatformUserId = (platformUser) =>
  platformUser?._id || platformUser?.id || null;

const GLOBAL_PRODUCT_POPULATE = {
  path: "globalProductId",
  select:
    "name globalProductCode marketer productType productForm pack qty imageUrl status",
};

const setPricing = async (payload, platformUser) => {
  // Price sanity checks
  if (payload.partnerSettlementPrice > payload.customerPrice) {
    throw new ApiError(
      400,
      "Partner settlement price cannot exceed customer price",
    );
  }

  if (payload.customerPrice > payload.mrp) {
    throw new ApiError(400, "Customer price cannot exceed MRP");
  }

  const platformUserId = getPlatformUserId(platformUser);

  // Upsert — one price per global product across the platform
  const existing = await platformPricingRepository.findByGlobalProductId(
    payload.globalProductId,
  );

  if (existing) {
    existing.mrp = payload.mrp;
    existing.customerPrice = payload.customerPrice;
    existing.partnerSettlementPrice = payload.partnerSettlementPrice;
    existing.deliveryCharge = payload.deliveryCharge ?? existing.deliveryCharge;
    existing.status = payload.status ?? existing.status;
    existing.setBy = platformUserId;

    await platformPricingRepository.savePricing(existing);

    const refreshed = await platformPricingRepository.findById(existing._id, {
      populate: GLOBAL_PRODUCT_POPULATE,
    });

    return refreshed.toSafeObject();
  }

  const pricing = await platformPricingRepository.createPricing({
    globalProductId: payload.globalProductId,
    mrp: payload.mrp,
    customerPrice: payload.customerPrice,
    partnerSettlementPrice: payload.partnerSettlementPrice,
    deliveryCharge: payload.deliveryCharge || 0,
    status: payload.status || PLATFORM_PRICING_STATUS.ACTIVE,
    setBy: platformUserId,
  });

  const populated = await platformPricingRepository.findById(pricing._id, {
    populate: GLOBAL_PRODUCT_POPULATE,
  });

  return populated.toSafeObject();
};

const getAllPricing = async (filters = {}) => {
  const pricingList = await platformPricingRepository.getAllPricing(filters, {
    populate: GLOBAL_PRODUCT_POPULATE,
  });

  return pricingList.map((p) => p.toSafeObject());
};

const getPricingById = async (pricingId) => {
  const pricing = await platformPricingRepository.findById(pricingId, {
    populate: GLOBAL_PRODUCT_POPULATE,
  });

  if (!pricing) {
    throw new ApiError(404, "Pricing record not found");
  }

  return pricing.toSafeObject();
};

const getPricingByGlobalProduct = async (globalProductId) => {
  const pricing = await platformPricingRepository.findByGlobalProductId(
    globalProductId,
  );

  if (!pricing) {
    throw new ApiError(404, "No pricing set for this product yet");
  }

  return pricing.toSafeObject();
};

const updatePricingStatus = async (pricingId, status, platformUser) => {
  const pricing = await platformPricingRepository.findById(pricingId);

  if (!pricing) {
    throw new ApiError(404, "Pricing record not found");
  }

  pricing.status = status;
  pricing.setBy = getPlatformUserId(platformUser);

  await platformPricingRepository.savePricing(pricing);

  return pricing.toSafeObject();
};

const deletePricing = async (pricingId, platformUser) => {
  const pricing = await platformPricingRepository.findById(pricingId);

  if (!pricing) {
    throw new ApiError(404, "Pricing record not found");
  }

  await platformPricingRepository.softDelete(
    pricingId,
    getPlatformUserId(platformUser),
  );

  return { success: true };
};

export default {
  setPricing,
  getAllPricing,
  getPricingById,
  getPricingByGlobalProduct,
  updatePricingStatus,
  deletePricing,
};
