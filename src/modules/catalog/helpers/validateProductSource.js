/**
 * validateProductSource.js
 *
 * Validates that a given productSource value is one of the
 * accepted catalog sources: "GLOBAL" or "WORKSPACE".
 *
 * Used as a guard before any product reference operation.
 *
 * Example (from gpnotes.md):
 *   validateProductSource("GLOBAL")    → true
 *   validateProductSource("WORKSPACE") → true
 *   validateProductSource("LOCAL")     → false (throws or returns false)
 */

import { PRODUCT_SOURCE_LIST } from "../constants/productSource.constant.js";

/**
 * Check if a productSource value is valid.
 *
 * @param {string} productSource
 * @returns {boolean}
 */
const isValidProductSource = (productSource) => {
  return typeof productSource === "string" &&
    PRODUCT_SOURCE_LIST.includes(productSource);
};

/**
 * Validate productSource — throws ApiError-compatible Error if invalid.
 *
 * @param {string} productSource
 * @throws {Error} If productSource is not "GLOBAL" or "WORKSPACE"
 */
const validateProductSource = (productSource) => {
  if (!isValidProductSource(productSource)) {
    throw new Error(
      `Invalid productSource "${productSource}". Accepted values: ${PRODUCT_SOURCE_LIST.join(", ")}`,
    );
  }
};

export { isValidProductSource, validateProductSource };

export default validateProductSource;
