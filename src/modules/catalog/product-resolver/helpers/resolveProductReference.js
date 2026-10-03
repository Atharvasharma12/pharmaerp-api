/**
 * resolveProductReference.js
 *
 * Decides which resolver to call based on productSource.
 *
 * This is the routing layer of the product resolver.
 * It reads the productSource field and delegates to the correct loader.
 *
 * Input (from gpnotes.md):
 *   { productSource: "GLOBAL" | "WORKSPACE", productId: ObjectId }
 *
 * Output:
 *   A fully resolved product plain object with productSource attached,
 *   or null if not found.
 */

import { PRODUCT_SOURCE } from "../../constants/productSource.constant.js";

import resolveGlobalProduct from "./resolveGlobalProduct.js";
import resolveWorkspaceProduct from "./resolveWorkspaceProduct.js";

/**
 * Resolve a product from its reference object.
 *
 * @param {{ productSource: string, productId: string }} ref  - Universal product reference
 * @param {string|null} [workspaceId]  - Required when productSource === "WORKSPACE"
 * @returns {Promise<object|null>} Resolved product or null
 * @throws {Error} If productSource is unknown
 */
const resolveProductReference = async (ref, workspaceId = null) => {
  if (!ref || !ref.productSource || !ref.productId) {
    return null;
  }

  const { productSource, productId } = ref;

  if (productSource === PRODUCT_SOURCE.GLOBAL) {
    return resolveGlobalProduct(productId);
  }

  if (productSource === PRODUCT_SOURCE.WORKSPACE) {
    if (!workspaceId) {
      throw new Error(
        "workspaceId is required to resolve a WORKSPACE product reference",
      );
    }

    return resolveWorkspaceProduct(productId, workspaceId);
  }

  throw new Error(
    `Unknown productSource "${productSource}". Expected "GLOBAL" or "WORKSPACE"`,
  );
};

export default resolveProductReference;
