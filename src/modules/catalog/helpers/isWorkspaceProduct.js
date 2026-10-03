/**
 * isWorkspaceProduct.js
 *
 * Checks whether a product reference points to a Workspace Product.
 *
 * Usage:
 *   if (isWorkspaceProduct(ref)) {
 *     // load from WorkspaceProduct collection
 *   }
 */

import { PRODUCT_SOURCE } from "../constants/productSource.constant.js";

/**
 * Returns true if the product reference is sourced from a Workspace catalog.
 *
 * @param {{ productSource: string, productId: string }} ref - Product reference object
 * @returns {boolean}
 */
const isWorkspaceProduct = (ref) => {
  return ref?.productSource === PRODUCT_SOURCE.WORKSPACE;
};

export default isWorkspaceProduct;
