/**
 * isGlobalProduct.js
 *
 * Checks whether a product reference points to a Global Product.
 *
 * Usage:
 *   if (isGlobalProduct(ref)) {
 *     // load from GlobalProduct collection
 *   }
 */

import { PRODUCT_SOURCE } from "../constants/productSource.constant.js";

/**
 * Returns true if the product reference is sourced from the Global Catalog.
 *
 * @param {{ productSource: string, productId: string }} ref - Product reference object
 * @returns {boolean}
 */
const isGlobalProduct = (ref) => {
  return ref?.productSource === PRODUCT_SOURCE.GLOBAL;
};

export default isGlobalProduct;
