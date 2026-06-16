/**
 * searchGlobalProduct.js
 *
 * Searches the GlobalProduct collection for products matching a query.
 *
 * Strategy (in order):
 * 1. MongoDB $text full-text search (uses the text index on name, marketer, composition, keyIngredients)
 * 2. Fallback to regex name search if text search yields nothing
 *
 * Returns a list of candidates with their names and IDs for similarity scoring.
 */

import GlobalProduct from "../../../platform/global-catalog/products/models/globalProduct.model.js";

import normalizeProductName from "./normalizeProductName.js";
import generateSearchTokens from "./generateSearchTokens.js";

const DEFAULT_LIMIT = 10;

/**
 * Search GlobalProduct collection by product name query.
 *
 * @param {string} query         - Raw product name to search
 * @param {object} [options]
 * @param {string} [options.productType]  - Filter by "medicine" | "otc"
 * @param {number} [options.limit]        - Max candidates to return
 * @returns {Promise<Array<{_id, name, globalProductCode, productType}>>}
 */
const searchGlobalProduct = async (query, options = {}) => {
  const { productType, limit = DEFAULT_LIMIT } = options;

  const normalized = normalizeProductName(query);

  if (!normalized) {
    return [];
  }

  const baseFilter = {
    isDeleted: false,
    status: "active",
  };

  if (productType) {
    baseFilter.productType = productType;
  }

  const selectFields = "name globalProductCode productType marketer";

  // --- Strategy 1: Full-text search ---
  let results = await GlobalProduct.find(
    {
      ...baseFilter,
      $text: { $search: normalized },
    },
    { score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .select(selectFields)
    .lean();

  if (results.length > 0) {
    return results;
  }

  // --- Strategy 2: Regex fallback on first significant token ---
  const tokens = generateSearchTokens(normalized, { includeStopwords: false });
  const primaryToken = tokens[0];

  if (!primaryToken) {
    return [];
  }

  results = await GlobalProduct.find({
    ...baseFilter,
    name: { $regex: new RegExp(primaryToken, "i") },
  })
    .limit(limit)
    .select(selectFields)
    .lean();

  return results;
};

export default searchGlobalProduct;
