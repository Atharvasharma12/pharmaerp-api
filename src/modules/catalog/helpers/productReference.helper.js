/**
 * productReference.helper.js
 *
 * Common product reference utilities — a single import point for all
 * product reference operations used across ERP modules.
 *
 * Architecture rule (gpnotes.md):
 * All modules (Inventory, Batch, Purchase, Sales, Billing, Reports)
 * store and consume product references as:
 *
 *   { productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }
 *
 * This file centralizes all reference helpers so downstream modules
 * import from one place.
 *
 * Usage:
 *   import productRefHelper from "../../catalog/helpers/productReference.helper.js";
 *
 *   const ref = productRefHelper.build("GLOBAL", productId);
 *   const isValid = productRefHelper.isValid(ref);
 *   const isGlobal = productRefHelper.isGlobal(ref);
 */

import {
  buildProductReference,
  buildGlobalProductReference,
  buildWorkspaceProductReference,
} from "./buildProductReference.js";

import { isValidProductSource, validateProductSource } from "./validateProductSource.js";

import isGlobalProduct from "./isGlobalProduct.js";
import isWorkspaceProduct from "./isWorkspaceProduct.js";

import { PRODUCT_SOURCE, PRODUCT_SOURCE_LIST } from "../constants/productSource.constant.js";

/**
 * Validate that an object is a well-formed product reference.
 *
 * @param {any} ref
 * @returns {boolean}
 */
const isValidProductReference = (ref) => {
  return (
    ref !== null &&
    typeof ref === "object" &&
    isValidProductSource(ref.productSource) &&
    !!ref.productId
  );
};

/**
 * Assert that a product reference is valid — throws if not.
 *
 * @param {any} ref
 * @throws {Error}
 */
const assertValidProductReference = (ref) => {
  if (!isValidProductReference(ref)) {
    throw new Error(
      `Invalid product reference: ${JSON.stringify(ref)}. ` +
      `Expected { productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }`,
    );
  }
};

/**
 * Extract productSource and productId from a reference object or mongoose doc.
 *
 * Handles:
 *   - Plain objects: { productSource, productId }
 *   - Mongoose docs with .toObject()
 *
 * @param {any} ref
 * @returns {{ productSource: string, productId: string }}
 */
const extractProductReference = (ref) => {
  const obj = typeof ref?.toObject === "function" ? ref.toObject() : ref;

  return {
    productSource: obj?.productSource,
    productId: obj?.productId?.toString?.() ?? String(obj?.productId ?? ""),
  };
};

const productRefHelper = {
  // Build
  build: buildProductReference,
  buildGlobal: buildGlobalProductReference,
  buildWorkspace: buildWorkspaceProductReference,

  // Validate
  isValid: isValidProductReference,
  assertValid: assertValidProductReference,
  isValidSource: isValidProductSource,
  validateSource: validateProductSource,

  // Check source type
  isGlobal: isGlobalProduct,
  isWorkspace: isWorkspaceProduct,

  // Utilities
  extract: extractProductReference,

  // Constants re-export for convenience
  SOURCE: PRODUCT_SOURCE,
  SOURCE_LIST: PRODUCT_SOURCE_LIST,
};

export default productRefHelper;
