/**
 * WorkspaceProduct Service
 *
 * Architecture rules (from gpnotes.md):
 * ─────────────────────────────────────
 * ✅ WorkspaceProduct is a custom product owned by a single Workspace.
 * ✅ Created only when no matching Global Product can be found in the catalog.
 * ✅ WorkspaceProduct stores: workspaceId, name, productType, manufacturer,
 *    pack, qty, productForm, HsnMaster (ref), notes, status, createdBy.
 *
 * ❌ WorkspaceProduct must NOT store:
 *    Medicine descriptions, drug interactions, safety advice,
 *    manufacturer address, country of origin, OTC information,
 *    regulatory data, MRP, PTR, PTS, stock, rack, inventory.
 *    (Descriptive/regulatory data belongs in GlobalProduct.
 *     Pricing belongs in Batch. Stock belongs in Inventory.)
 *
 * ❌ Never duplicate a Global Product as a Workspace Product.
 *    Global Product always takes priority.
 *
 * 🔗 HsnMaster is the single source of truth for GST/tax.
 *    Never inline GST rate or HSN description in WorkspaceProduct.
 *
 * 📦 productType is immutable after creation.
 *
 * 🔒 All queries are scoped to workspaceId — cross-workspace access is forbidden.
 *
 * 📋 Product reference pattern used by downstream modules (Inventory, Batch, etc.):
 *    { productSource: "WORKSPACE", productId: ObjectId }
 */

import ApiError from "../../../../utils/ApiError.js";

import workspaceProductRepository from "../repositories/workspaceProduct.repository.js";
import productSearchModule from "../../product-search/productSearch.module.js";

import {
  WORKSPACE_PRODUCT_STATUS,
  WORKSPACE_PRODUCT_SOURCE,
} from "../constants/workspaceProduct.constant.js";

const getUserId = (user) => {
  return user?._id || user?.id || null;
};

// ---------------------
// Create
// ---------------------

/**
 * Search the global catalog before creating a workspace product.
 *
 * Call this from the frontend BEFORE calling createWorkspaceProduct.
 * It returns suggestions from the global catalog so the user can pick
 * a global product instead of creating a duplicate workspace one.
 *
 * Returns:
 *   { matched: true, confidence, productSource, productId, name, suggestions }
 *   OR
 *   { matched: false, suggestions: [...] }
 */
const searchBeforeCreate = async (name, workspaceId, productType = null) => {
  const result = await productSearchModule.search(name, workspaceId, {
    productType: productType || undefined,
  });

  return result;
};

/**
 * Create a new Workspace Product.
 *
 * Rules:
 * - Checks global catalog first — blocks creation if a confident global match
 *   is found (confidence ≥ 90%). Pass `force: true` to skip this check
 *   (e.g. user has already reviewed suggestions and explicitly wants a workspace product).
 * - Enforces name uniqueness within the same workspace.
 * - productType is set and remains immutable.
 */
const createWorkspaceProduct = async (workspaceId, payload, user) => {
  const userId = getUserId(user);

  // ─────────────────────────────────────────────────────────────────────
  // Step 1 — Global catalog duplicate guard
  //
  // Before creating a workspace product, search the global catalog.
  // If a confident match (≥ 90%) is found in the GLOBAL catalog, block
  // creation and inform the caller to use the global product instead.
  //
  // The caller (frontend) can pass `force: true` to bypass this check
  // after the user has reviewed the suggestions and explicitly decided
  // to create a workspace product anyway.
  // ─────────────────────────────────────────────────────────────────────
  if (!payload.force) {
    const searchResult = await productSearchModule.search(
      payload.name,
      workspaceId,
      { productType: payload.productType || undefined },
    );

    if (searchResult.matched && searchResult.productSource === "GLOBAL") {
      throw new ApiError(
        409,
        `A matching Global Product already exists: "${searchResult.name}". ` +
        `Use the Global Product instead of creating a workspace product, ` +
        `or pass force=true to create anyway.`,
        {
          matched: true,
          confidence: searchResult.confidence,
          productSource: searchResult.productSource,
          productId: searchResult.productId,
          productName: searchResult.name,
          suggestions: searchResult.suggestions,
        },
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 2 — Name uniqueness within this workspace
  // ─────────────────────────────────────────────────────────────────────
  const existing = await workspaceProductRepository.findWorkspaceProductByName(
    payload.name,
    workspaceId,
  );

  if (existing) {
    throw new ApiError(
      400,
      "A product with this name already exists in this workspace",
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 3 — Create workspace product
  // ─────────────────────────────────────────────────────────────────────
  const product = await workspaceProductRepository.createWorkspaceProduct({
    workspaceId,
    productType: payload.productType,
    name: payload.name,
    manufacturer: payload.manufacturer,
    pack: payload.pack,
    qty: payload.qty,
    productForm: payload.productForm,
    HsnMaster: payload.HsnMaster || null,
    notes: payload.notes,
    source: WORKSPACE_PRODUCT_SOURCE.WORKSPACE,
    status: payload.status || WORKSPACE_PRODUCT_STATUS.ACTIVE,
    createdBy: userId,
    updatedBy: userId,
  });

  return product.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getWorkspaceProducts = async (workspaceId, filters = {}, options = {}) => {
  const { products, total, page, limit } =
    await workspaceProductRepository.getWorkspaceProducts(
      workspaceId,
      filters,
      options,
    );

  return {
    products: products.map((p) => p.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getWorkspaceProductById = async (productId, workspaceId) => {
  const product = await workspaceProductRepository.findWorkspaceProductById(
    productId,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return product.toSafeObject();
};

const getWorkspaceProductByCode = async (workspaceProductCode, workspaceId) => {
  const product = await workspaceProductRepository.findWorkspaceProductByCode(
    workspaceProductCode,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return product.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Workspace Product.
 *
 * Rules:
 * - productType is IMMUTABLE — cannot be changed after creation.
 * - HsnMaster can be updated to link correct GST (never inline GST data).
 * - Regulatory/descriptive fields must never be added here.
 * - Name uniqueness within workspace is re-enforced on rename.
 */
const updateWorkspaceProduct = async (productId, workspaceId, payload, user) => {
  const product = await workspaceProductRepository.findWorkspaceProductById(
    productId,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  // Re-enforce name uniqueness if name is being changed
  if (payload.name && payload.name.trim() !== product.name) {
    const existing =
      await workspaceProductRepository.findWorkspaceProductByName(
        payload.name,
        workspaceId,
      );

    if (existing && existing._id.toString() !== product._id.toString()) {
      throw new ApiError(
        400,
        "A product with this name already exists in this workspace",
      );
    }
  }

  const allowedFields = [
    "name",
    "manufacturer",
    "pack",
    "qty",
    "productForm",
    "HsnMaster",
    "notes",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      product[field] = payload[field];
    }
  });

  product.updatedBy = getUserId(user);

  await workspaceProductRepository.saveWorkspaceProduct(product);

  return product.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

const deleteWorkspaceProduct = async (productId, workspaceId, user) => {
  const product =
    await workspaceProductRepository.softDeleteWorkspaceProductById(
      productId,
      workspaceId,
      getUserId(user),
    );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return { success: true };
};

export default {
  searchBeforeCreate,
  createWorkspaceProduct,
  getWorkspaceProducts,
  getWorkspaceProductById,
  getWorkspaceProductByCode,
  updateWorkspaceProduct,
  deleteWorkspaceProduct,
};
