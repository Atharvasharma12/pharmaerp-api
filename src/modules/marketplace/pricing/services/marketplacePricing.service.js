import ApiError from "../../../../utils/ApiError.js";

import platformPricingRepository from "../../../platform/pricing/repositories/platformPricing.repository.js";
import marketplaceStoreRepository from "../../stores/repositories/marketplaceStore.repository.js";
import marketplaceProductRepository from "../../products/repositories/marketplaceProduct.repository.js";

import {
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../stores/constants/marketplaceStore.constant.js";

// Partners can ONLY see their settlement price — NOT customer price or platform margin
const toPartnerSafeObject = (pricing, marketplaceProduct = null) => {
  return {
    globalProductId: pricing.globalProductId,
    mrp: pricing.mrp,
    // The amount Pahuch will pay the partner per unit sold
    partnerSettlementPrice: pricing.partnerSettlementPrice,
    // Their effective discount from MRP
    discountFromMrp:
      pricing.mrp > 0
        ? parseFloat(
            (
              ((pricing.mrp - pricing.partnerSettlementPrice) / pricing.mrp) *
              100
            ).toFixed(2),
          )
        : 0,
    deliveryCharge: pricing.deliveryCharge,
    status: pricing.status,
    updatedAt: pricing.updatedAt,
    // Attach the marketplace product context if provided
    marketplaceProduct: marketplaceProduct
      ? {
          _id: marketplaceProduct._id,
          visibility: marketplaceProduct.visibility,
          isFeatured: marketplaceProduct.isFeatured,
          status: marketplaceProduct.status,
        }
      : undefined,
  };
};

const getStoreForPartner = async (user) => {
  const store = await marketplaceStoreRepository.findStoreByBranchId(
    user.branchId,
  );

  if (!store) {
    throw new ApiError(404, "No marketplace store found for your account");
  }

  if (
    store.verificationStatus !== MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(
      403,
      "Your store must be approved before viewing pricing",
    );
  }

  return store;
};

// Get pricing for all products the partner has enabled — bulk fetch
const getMyStorePricing = async (user) => {
  const store = await getStoreForPartner(user);

  // Get all marketplace products enabled by this store
  const enabledProducts = await marketplaceProductRepository.getProductsByStore(
    store._id,
    { status: "ACTIVE" },
  );

  if (!enabledProducts.length) {
    return [];
  }

  // Extract the globalProductIds
  const globalProductIds = enabledProducts.map((p) => p.globalProductId);

  // Bulk-fetch platform pricing for these global products
  const pricingList = await platformPricingRepository.findManyByGlobalProductIds(
    globalProductIds,
  );

  // Build a map globalProductId → marketplaceProduct for joining
  const productMap = {};
  enabledProducts.forEach((mp) => {
    productMap[mp.globalProductId.toString()] = mp;
  });

  // Join and return partner-safe view
  return pricingList.map((pricing) => {
    const mp = productMap[pricing.globalProductId.toString()];
    return toPartnerSafeObject(pricing, mp);
  });
};

// Get pricing for a single global product the partner has enabled
const getMyProductPricing = async (globalProductId, user) => {
  const store = await getStoreForPartner(user);

  // Confirm this global product is actually enabled by this store
  const marketplaceProduct =
    await marketplaceProductRepository.findByStoreAndGlobalProduct(
      store._id,
      globalProductId,
    );

  if (!marketplaceProduct) {
    throw new ApiError(
      404,
      "This product is not enabled in your store",
    );
  }

  const pricing = await platformPricingRepository.findByGlobalProductId(
    globalProductId,
  );

  if (!pricing) {
    throw new ApiError(404, "Pricing not set for this product yet");
  }

  return toPartnerSafeObject(pricing, marketplaceProduct);
};

export default {
  getMyStorePricing,
  getMyProductPricing,
};
