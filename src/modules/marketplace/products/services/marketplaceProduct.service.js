import ApiError from "../../../../utils/ApiError.js";

import marketplaceProductRepository from "../repositories/marketplaceProduct.repository.js";
import marketplaceStoreRepository from "../../stores/repositories/marketplaceStore.repository.js";

import {
  MARKETPLACE_PRODUCT_STATUS,
  MARKETPLACE_PRODUCT_VISIBILITY,
} from "../constants/marketplaceProduct.constant.js";

import {
  MARKETPLACE_STORE_VERIFICATION_STATUS,
} from "../../stores/constants/marketplaceStore.constant.js";

const getUserId = (user) => user?._id || user?.id || null;

const GLOBAL_PRODUCT_POPULATE = {
  path: "globalProductId",
  select:
    "name globalProductCode marketer productType productForm pack qty imageUrl medicineDetails.prescriptionRequired medicineDetails.composition status",
};

const getStoreForUser = async (user) => {
  const { workspaceId } = user;

  // Partner must have a verified & active store to manage products
  const store = await marketplaceStoreRepository.findStoreByBranchId(
    user.branchId,
  );

  if (!store) {
    throw new ApiError(
      404,
      "No marketplace store found. Please register a store first.",
    );
  }

  if (
    store.verificationStatus !== MARKETPLACE_STORE_VERIFICATION_STATUS.APPROVED
  ) {
    throw new ApiError(
      403,
      "Your store must be approved before managing products.",
    );
  }

  return store;
};

const enableProduct = async (payload, user) => {
  const store = await getStoreForUser(user);

  // Check if this global product is already enabled
  const existing = await marketplaceProductRepository.findByStoreAndGlobalProduct(
    store._id,
    payload.globalProductId,
  );

  if (existing) {
    throw new ApiError(
      400,
      "This product is already enabled for your store.",
    );
  }

  const product = await marketplaceProductRepository.createProduct({
    workspaceId: user.workspaceId,
    marketplaceStoreId: store._id,
    globalProductId: payload.globalProductId,
    visibility: payload.visibility || MARKETPLACE_PRODUCT_VISIBILITY.VISIBLE,
    prescriptionRequired: payload.prescriptionRequired,
    isFeatured: payload.isFeatured || false,
    sortOrder: payload.sortOrder || 0,
    status: MARKETPLACE_PRODUCT_STATUS.ACTIVE,
    enabledAt: new Date(),
    enabledBy: getUserId(user),
    createdBy: getUserId(user),
  });

  const populated = await marketplaceProductRepository.findByStoreAndId(
    store._id,
    product._id,
    { populate: GLOBAL_PRODUCT_POPULATE },
  );

  return populated.toSafeObject();
};

const getEnabledProducts = async (user, filters = {}) => {
  const store = await getStoreForUser(user);

  const products = await marketplaceProductRepository.getProductsByStore(
    store._id,
    filters,
    { populate: GLOBAL_PRODUCT_POPULATE },
  );

  return products.map((p) => p.toSafeObject());
};

const getEnabledProductById = async (productId, user) => {
  const store = await getStoreForUser(user);

  const product = await marketplaceProductRepository.findByStoreAndId(
    store._id,
    productId,
    { populate: GLOBAL_PRODUCT_POPULATE },
  );

  if (!product) {
    throw new ApiError(404, "Marketplace product not found");
  }

  return product.toSafeObject();
};

const updateProduct = async (productId, payload, user) => {
  const store = await getStoreForUser(user);

  const product = await marketplaceProductRepository.findByStoreAndId(
    store._id,
    productId,
  );

  if (!product) {
    throw new ApiError(404, "Marketplace product not found");
  }

  const allowedFields = [
    "visibility",
    "prescriptionRequired",
    "isFeatured",
    "sortOrder",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      product[field] = payload[field];
    }
  });

  await marketplaceProductRepository.saveProduct(product);

  return product.toSafeObject();
};

const disableProduct = async (productId, user) => {
  const store = await getStoreForUser(user);

  const product = await marketplaceProductRepository.findByStoreAndId(
    store._id,
    productId,
  );

  if (!product) {
    throw new ApiError(404, "Marketplace product not found");
  }

  await marketplaceProductRepository.softDeleteProduct(productId, getUserId(user));

  return { success: true };
};

export default {
  enableProduct,
  getEnabledProducts,
  getEnabledProductById,
  updateProduct,
  disableProduct,
};
