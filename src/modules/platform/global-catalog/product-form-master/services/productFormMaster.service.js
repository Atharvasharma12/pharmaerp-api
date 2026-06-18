import ApiError from "../../../../../utils/ApiError.js";

import productFormMasterRepository from "../repositories/productFormMaster.repository.js";
import { PRODUCT_FORM_MASTER_STATUS } from "../constants/productFormMaster.constant.js";

// ---------------------
// Create
// ---------------------

/**
 * Create a new Product Form master record.
 * - name must be unique (case-insensitive) across all records.
 */
const createProductFormMaster = async (payload) => {
  const existing = await productFormMasterRepository.findProductFormMasterByName(payload.name);

  if (existing) {
    throw new ApiError(400, `Product Form with name "${payload.name.trim()}" already exists`);
  }

  const formPayload = {
    name: payload.name.trim(),
    description: payload.description || null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : PRODUCT_FORM_MASTER_STATUS.ACTIVE,
  };

  const productFormMaster = await productFormMasterRepository.createProductFormMaster(formPayload);

  return productFormMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getProductFormMasters = async (filters = {}, options = {}) => {
  const { productFormMasters, total, page, limit } =
    await productFormMasterRepository.getProductFormMasters(filters, options);

  return {
    productFormMasters: productFormMasters.map((f) => f.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getProductFormMasterById = async (formId) => {
  const productFormMaster = await productFormMasterRepository.findProductFormMasterById(formId);

  if (!productFormMaster) {
    throw new ApiError(404, "Product Form master record not found");
  }

  return productFormMaster.toSafeObject();
};

const getProductFormMasterByName = async (name) => {
  const productFormMaster = await productFormMasterRepository.findProductFormMasterByName(name);

  if (!productFormMaster) {
    throw new ApiError(404, "Product Form master record not found");
  }

  return productFormMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Product Form master record.
 *
 * Rules:
 * - if name is updated, check uniqueness constraint.
 * - description and isActive can be freely updated.
 */
const updateProductFormMaster = async (formId, payload) => {
  const productFormMaster = await productFormMasterRepository.findProductFormMasterById(formId);

  if (!productFormMaster) {
    throw new ApiError(404, "Product Form master record not found");
  }

  if (payload.name && payload.name.trim().toLowerCase() !== productFormMaster.name.toLowerCase()) {
    const existing = await productFormMasterRepository.findProductFormMasterByName(payload.name);
    if (existing) {
      throw new ApiError(400, `Product Form with name "${payload.name.trim()}" already exists`);
    }
    productFormMaster.name = payload.name.trim();
  }

  const allowedFields = ["description", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      productFormMaster[field] = payload[field];
    }
  });

  await productFormMasterRepository.saveProductFormMaster(productFormMaster);

  return productFormMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete a Product Form master record.
 */
const deleteProductFormMaster = async (formId) => {
  const productFormMaster = await productFormMasterRepository.deleteProductFormMasterById(formId);

  if (!productFormMaster) {
    throw new ApiError(404, "Product Form master record not found");
  }

  return { success: true };
};

export default {
  createProductFormMaster,
  getProductFormMasters,
  getProductFormMasterById,
  getProductFormMasterByName,
  updateProductFormMaster,
  deleteProductFormMaster,
};
