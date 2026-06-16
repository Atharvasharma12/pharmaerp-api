/**
 * resolveWorkspaceProduct.js
 *
 * Loads a WorkspaceProduct document by its ID, scoped to a workspace.
 *
 * Used by productResolver when productSource === "WORKSPACE".
 * Returns a normalized plain object safe for use in Inventory, Batch, etc.
 */

import mongoose from "mongoose";
import WorkspaceProduct from "../../products/models/workspaceProduct.model.js";

/**
 * Resolve a WorkspaceProduct by its ID, within a specific workspace.
 *
 * @param {string|import("mongoose").Types.ObjectId} productId
 * @param {string|import("mongoose").Types.ObjectId} workspaceId - Scope guard
 * @returns {Promise<object|null>} Resolved product plain object, or null if not found
 */
const resolveWorkspaceProduct = async (productId, workspaceId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  const product = await WorkspaceProduct.findOne({
    _id: productId,
    workspaceId,
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
    productSource: "WORKSPACE",
  };
};

export default resolveWorkspaceProduct;
