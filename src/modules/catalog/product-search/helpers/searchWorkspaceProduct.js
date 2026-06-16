/**
 * searchWorkspaceProduct.js
 *
 * Searches the WorkspaceProduct collection for products belonging to
 * a specific workspace that match a query name.
 *
 * Strategy:
 * 1. Case-insensitive regex search on name (WorkspaceProduct has no text index)
 * 2. Scoped strictly to the caller's workspaceId
 *
 * Returns candidates for similarity scoring.
 */

import WorkspaceProduct from "../../products/models/workspaceProduct.model.js";

import normalizeProductName from "./normalizeProductName.js";
import generateSearchTokens from "./generateSearchTokens.js";

const DEFAULT_LIMIT = 10;

/**
 * Search WorkspaceProduct collection for a workspace by product name.
 *
 * @param {string} query         - Raw product name to search
 * @param {string} workspaceId   - Scope to this workspace (required)
 * @param {object} [options]
 * @param {string} [options.productType]  - Filter by "medicine" | "otc"
 * @param {number} [options.limit]        - Max candidates to return
 * @returns {Promise<Array<{_id, name, workspaceProductCode, productType}>>}
 */
const searchWorkspaceProduct = async (query, workspaceId, options = {}) => {
  const { productType, limit = DEFAULT_LIMIT } = options;

  const normalized = normalizeProductName(query);

  if (!normalized || !workspaceId) {
    return [];
  }

  const tokens = generateSearchTokens(normalized, { includeStopwords: false });
  const primaryToken = tokens[0] || normalized;

  const filter = {
    workspaceId,
    isDeleted: false,
    status: "active",
    name: { $regex: new RegExp(primaryToken, "i") },
  };

  if (productType) {
    filter.productType = productType;
  }

  const results = await WorkspaceProduct.find(filter)
    .limit(limit)
    .select("name workspaceProductCode productType manufacturer")
    .lean();

  return results;
};

export default searchWorkspaceProduct;
