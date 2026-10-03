/**
 * productResolver.service.js
 *
 * Single entry point for resolving product references.
 *
 * Used by: Inventory, Batch, Purchase, Sales, Billing, Reports
 *
 * Example (from gpnotes.md):
 *   productResolver.resolve(productSource, productId)
 *
 * This service is the ONLY way downstream modules should load product data.
 * They never query GlobalProduct or WorkspaceProduct directly.
 *
 * Usage in downstream modules:
 *
 *   import productResolverService from "../../catalog/product-resolver/services/productResolver.service.js";
 *
 *   // Single product
 *   const product = await productResolverService.resolve(
 *     "GLOBAL",
 *     "64abc123...",
 *   );
 *
 *   // From a stored reference object
 *   const product = await productResolverService.resolveRef(
 *     { productSource: "GLOBAL", productId: "64abc123..." },
 *   );
 *
 *   // Bulk resolve (e.g. for a purchase order line items)
 *   const products = await productResolverService.resolveMany(lineItems, workspaceId);
 */

import ApiError from "../../../../utils/ApiError.js";

import resolveProductReference from "../helpers/resolveProductReference.js";
import { isValidProductSource } from "../../helpers/validateProductSource.js";

// ---------------------
// Resolve single product
// ---------------------

/**
 * Resolve a product by source and ID.
 *
 * @param {"GLOBAL"|"WORKSPACE"} productSource
 * @param {string} productId
 * @param {string|null} [workspaceId] - Required for WORKSPACE products
 * @returns {Promise<object>} Resolved product plain object
 * @throws {ApiError} 404 if product not found, 400 if invalid reference
 */
const resolve = async (productSource, productId, workspaceId = null) => {
  if (!isValidProductSource(productSource)) {
    throw new ApiError(
      400,
      `Invalid productSource "${productSource}". Must be "GLOBAL" or "WORKSPACE"`,
    );
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const product = await resolveProductReference(
    { productSource, productId },
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, `Product not found (${productSource}:${productId})`);
  }

  return product;
};

/**
 * Resolve a product from a stored reference object.
 *
 * @param {{ productSource: string, productId: string }} ref
 * @param {string|null} [workspaceId]
 * @returns {Promise<object>}
 */
const resolveRef = async (ref, workspaceId = null) => {
  if (!ref?.productSource || !ref?.productId) {
    throw new ApiError(400, "Invalid product reference object");
  }

  return resolve(ref.productSource, ref.productId, workspaceId);
};

/**
 * Attempt to resolve a product — returns null instead of throwing on 404.
 * Useful when you need to check existence without error handling overhead.
 *
 * @param {string} productSource
 * @param {string} productId
 * @param {string|null} [workspaceId]
 * @returns {Promise<object|null>}
 */
const tryResolve = async (productSource, productId, workspaceId = null) => {
  try {
    return await resolveProductReference(
      { productSource, productId },
      workspaceId,
    );
  } catch {
    return null;
  }
};

// ---------------------
// Bulk resolve
// ---------------------

/**
 * Resolve multiple product references in parallel.
 *
 * @param {Array<{ productSource: string, productId: string }>} refs
 * @param {string|null} [workspaceId]
 * @returns {Promise<object[]>} Array of resolved products (nulls filtered out)
 */
const resolveMany = async (refs = [], workspaceId = null) => {
  const results = await Promise.all(
    refs.map((ref) =>
      resolveProductReference(ref, workspaceId).catch(() => null),
    ),
  );

  return results.filter(Boolean);
};

/**
 * Resolve an array of line-item-style objects that each contain a product reference.
 * Attaches the resolved product as `product` on each item.
 *
 * @param {Array<{ productSource: string, productId: string, [key]: any }>} items
 * @param {string|null} [workspaceId]
 * @returns {Promise<Array<{ ...item, product: object|null }>>}
 */
const resolveLineItems = async (items = [], workspaceId = null) => {
  return Promise.all(
    items.map(async (item) => {
      const product = await resolveProductReference(
        { productSource: item.productSource, productId: item.productId },
        workspaceId,
      ).catch(() => null);

      return { ...item, product };
    }),
  );
};

export default {
  resolve,
  resolveRef,
  tryResolve,
  resolveMany,
  resolveLineItems,
};
