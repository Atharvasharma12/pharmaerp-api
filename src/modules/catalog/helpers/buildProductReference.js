/**
 * buildProductReference.js
 *
 * Creates the universal product reference object used by all ERP modules.
 *
 * Architecture rule (gpnotes.md):
 * Every module — Inventory, Batch, Purchase, Sales, Billing, Reports —
 * must store product references in this exact shape:
 *
 *   { productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }
 *
 * Never store globalProductId or workspaceProductId separately in other modules.
 *
 * Example (from gpnotes.md):
 *   buildProductReference("GLOBAL", "64abc123...")
 *   → { productSource: "GLOBAL", productId: "64abc123..." }
 */

import { PRODUCT_SOURCE, PRODUCT_SOURCE_LIST } from "../constants/productSource.constant.js";

/**
 * Build a standard product reference object.
 *
 * @param {"GLOBAL"|"WORKSPACE"} productSource - Source catalog
 * @param {string|import("mongoose").Types.ObjectId} productId - Product document ID
 * @returns {{ productSource: string, productId: string }}
 * @throws {Error} If productSource is invalid or productId is missing
 */
const buildProductReference = (productSource, productId) => {
  if (!productSource || !PRODUCT_SOURCE_LIST.includes(productSource)) {
    throw new Error(
      `Invalid productSource "${productSource}". Must be one of: ${PRODUCT_SOURCE_LIST.join(", ")}`,
    );
  }

  if (!productId) {
    throw new Error("productId is required to build a product reference");
  }

  return {
    productSource,
    productId: productId.toString(),
  };
};

/**
 * Convenience: build a GLOBAL product reference.
 */
const buildGlobalProductReference = (productId) =>
  buildProductReference(PRODUCT_SOURCE.GLOBAL, productId);

/**
 * Convenience: build a WORKSPACE product reference.
 */
const buildWorkspaceProductReference = (productId) =>
  buildProductReference(PRODUCT_SOURCE.WORKSPACE, productId);

export {
  buildProductReference,
  buildGlobalProductReference,
  buildWorkspaceProductReference,
};

export default buildProductReference;
