/**
 * GlobalProduct Service
 *
 * Architecture rules (from gpnotes.md):
 * ─────────────────────────────────────
 * ✅ GlobalProduct IS the master medicine/OTC catalog owned by Platform.
 * ✅ GlobalProduct stores: name, productType, marketer, manufacturer details,
 *    packagingDetail, pack, qty, productForm, imageUrl, medicineDetails,
 *    otcDetails, HsnMaster (ref), views, dataSource, status.
 *
 * ❌ GlobalProduct must NOT store:
 *    MRP, PTR, PTS, Margin, Purchase Rate, Selling Rate,
 *    Rack, Stock Quantity, Branch Data, Inventory Data.
 *    (Those belong to Batch and Inventory modules.)
 *
 * ❌ productType is immutable after creation — medicine/OTC details
 *    are tightly bound to the product type.
 *
 * 🔗 HsnMaster is the single source of truth for tax (GST) information.
 *    Never duplicate GST/HSN data inside Product records.
 *
 * 📦 Every other module (Inventory, Batch, Purchase, Sales, Billing)
 *    references products using the universal pattern:
 *      { productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }
 *    and loads them through catalog/product-resolver/.
 */

import ApiError from "../../../../../utils/ApiError.js";

import globalProductRepository from "../repositories/globalProduct.repository.js";

import {
  GLOBAL_PRODUCT_STATUS,
  GLOBAL_PRODUCT_TYPE,
  GLOBAL_PRODUCT_DATA_SOURCE,
} from "../constants/globalProduct.constant.js";

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

// ---------------------
// Create
// ---------------------

/**
 * Create a new Global Product.
 *
 * - For API/IMPORT data sources, externalProductId uniqueness is enforced.
 * - medicineDetails is only accepted when productType === "medicine".
 * - otcDetails is only accepted when productType === "otc".
 * - Pricing fields (MRP, PTR, etc.) must never be passed here.
 */
const createGlobalProduct = async (payload, platformUser) => {
  const platformUserId = getPlatformUserId(platformUser);

  // Enforce external ID uniqueness for non-manual sources
  if (
    payload.dataSource &&
    payload.dataSource !== GLOBAL_PRODUCT_DATA_SOURCE.MANUAL &&
    payload.externalProductId
  ) {
    const existing =
      await globalProductRepository.findGlobalProductByExternalId(
        payload.dataSource,
        payload.externalProductId,
      );

    if (existing) {
      throw new ApiError(
        400,
        "A product with this external ID already exists for this data source",
      );
    }
  }

  const productPayload = {
    productType: payload.productType,
    name: payload.name,
    marketer: payload.marketer,
    packagingDetail: payload.packagingDetail,
    pack: payload.pack,
    qty: payload.qty,
    productForm: payload.productForm,
    manufacturerAddress: payload.manufacturerAddress,
    countryOfOrigin: payload.countryOfOrigin,
    manufacturerDetails: payload.manufacturerDetails,
    marketerDetails: payload.marketerDetails,
    imageUrl: payload.imageUrl,
    externalProductId: payload.externalProductId || null,
    dataSource: payload.dataSource || GLOBAL_PRODUCT_DATA_SOURCE.MANUAL,
    status: payload.status || GLOBAL_PRODUCT_STATUS.ACTIVE,
    HsnMaster: payload.HsnMaster || null,
    createdBy: platformUserId,
    updatedBy: platformUserId,
  };

  // Only attach type-specific details when productType matches
  if (payload.productType === GLOBAL_PRODUCT_TYPE.MEDICINE) {
    productPayload.medicineDetails = payload.medicineDetails || {};
  }

  if (payload.productType === GLOBAL_PRODUCT_TYPE.OTC) {
    productPayload.otcDetails = payload.otcDetails || {};
  }

  const product =
    await globalProductRepository.createGlobalProduct(productPayload);

  return product.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getGlobalProducts = async (filters = {}, options = {}) => {
  const { products, total, page, limit } =
    await globalProductRepository.getGlobalProducts(filters, options);

  return {
    products: products.map((p) => p.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getGlobalProductById = async (productId) => {
  const product =
    await globalProductRepository.findGlobalProductById(productId);

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  return product.toSafeObject();
};

const getGlobalProductByCode = async (globalProductCode) => {
  const product =
    await globalProductRepository.findGlobalProductByCode(globalProductCode);

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  return product.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Global Product.
 *
 * Rules:
 * - productType is IMMUTABLE — it cannot be changed after creation.
 * - medicineDetails/otcDetails can be updated only when they match the existing productType.
 * - HsnMaster can be updated to link correct GST info (do not inline GST data).
 * - Pricing fields must never be accepted here.
 */
const updateGlobalProduct = async (productId, payload, platformUser) => {
  const product =
    await globalProductRepository.findGlobalProductById(productId);

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  const allowedCommonFields = [
    "name",
    "marketer",
    "packagingDetail",
    "pack",
    "qty",
    "productForm",
    "manufacturerAddress",
    "countryOfOrigin",
    "manufacturerDetails",
    "marketerDetails",
    "imageUrl",
    "status",
    "HsnMaster",
  ];

  allowedCommonFields.forEach((field) => {
    if (payload[field] !== undefined) {
      product[field] = payload[field];
    }
  });

  // Merge medicine details — only if product is of type medicine
  if (
    product.productType === GLOBAL_PRODUCT_TYPE.MEDICINE &&
    payload.medicineDetails
  ) {
    const existing = product.medicineDetails?.toObject?.() ?? {};
    product.medicineDetails = {
      ...existing,
      ...payload.medicineDetails,
    };
  }

  // Merge OTC details — only if product is of type otc
  if (
    product.productType === GLOBAL_PRODUCT_TYPE.OTC &&
    payload.otcDetails
  ) {
    const existing = product.otcDetails?.toObject?.() ?? {};
    product.otcDetails = {
      ...existing,
      ...payload.otcDetails,
    };
  }

  product.updatedBy = getPlatformUserId(platformUser);

  await globalProductRepository.saveGlobalProduct(product);

  return product.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

const deleteGlobalProduct = async (productId, platformUser) => {
  const product = await globalProductRepository.softDeleteGlobalProductById(
    productId,
    getPlatformUserId(platformUser),
  );

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  return { success: true };
};

// ---------------------
// Views
// ---------------------

/**
 * Increment the product view counter.
 * Called whenever a workspace or any consumer views the product detail.
 * views is a read-popularity metric stored on GlobalProduct per architecture design.
 */
const incrementGlobalProductViews = async (productId) => {
  const product = await globalProductRepository.incrementViews(productId);

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  return product.toSafeObject();
};

export default {
  createGlobalProduct,
  getGlobalProducts,
  getGlobalProductById,
  getGlobalProductByCode,
  updateGlobalProduct,
  deleteGlobalProduct,
  incrementGlobalProductViews,
};
