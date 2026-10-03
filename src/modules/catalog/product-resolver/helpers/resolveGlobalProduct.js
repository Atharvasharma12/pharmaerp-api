/**
 * resolveGlobalProduct.js
 *
 * Loads a GlobalProduct document by its ID.
 *
 * Used by productResolver when productSource === "GLOBAL".
 * Returns a normalized plain object safe for use in Inventory, Batch, etc.
 */

import mongoose from "mongoose";
import GlobalProduct from "../../../platform/global-catalog/products/models/globalProduct.model.js";

/**
 * Resolve a GlobalProduct by its ID.
 *
 * @param {string|import("mongoose").Types.ObjectId} productId
 * @returns {Promise<object|null>} Resolved product plain object, or null if not found
 */
const resolveGlobalProduct = async (productId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const product = await GlobalProduct.findOne({
    _id: productId,
    isDeleted: false,
    status: "active",
  })
    .populate("HsnMaster", "code description gstRate cessRate isActive")
    .lean();

  if (!product) {
    return null;
  }

  // Attach source metadata so consumers know where this product came from
  return {
    ...product,
    productSource: "GLOBAL",
  };
};

export default resolveGlobalProduct;
