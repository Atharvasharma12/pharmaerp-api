/**
 * productSearch.service.js
 *
 * Main orchestrator for product search.
 *
 * Flow (from gpnotes.md):
 * ─────────────────────────────────────
 *   Normalize
 *      ↓
 *   Search (Global + Workspace in parallel)
 *      ↓
 *   Similarity Check
 *      ↓
 *   Suggestions
 *
 * Returns:
 * ─────────────────────────────────────
 * Case 1 — Exact / high-confidence match found:
 *   {
 *     matched: true,
 *     confidence: 97,
 *     productSource: "GLOBAL" | "WORKSPACE",
 *     productId: ObjectId,
 *     suggestions: []
 *   }
 *
 * Case 2 — No confident match, but suggestions exist:
 *   {
 *     matched: false,
 *     confidence: 0,
 *     productSource: null,
 *     productId: null,
 *     suggestions: [ { name, confidence, productSource, productId }, ... ]
 *   }
 *
 * Case 3 — No results at all:
 *   {
 *     matched: false,
 *     confidence: 0,
 *     productSource: null,
 *     productId: null,
 *     suggestions: []
 *   }
 *
 * Usage in Product Creation Flow:
 *   const result = await productSearchService.search("Dolo 650", workspaceId);
 *   if (result.matched) {
 *     // Use Global/Workspace product — never create duplicate
 *   } else {
 *     // Create Workspace Product using result.suggestions as context
 *   }
 */

import normalizeProductName from "../helpers/normalizeProductName.js";
import searchGlobalProduct from "../helpers/searchGlobalProduct.js";
import searchWorkspaceProduct from "../helpers/searchWorkspaceProduct.js";
import suggestMatches from "../helpers/suggestMatches.js";

/**
 * Confidence threshold above which a product is considered a confident match.
 * Matches at or above this score return matched: true.
 */
const CONFIDENT_MATCH_THRESHOLD = 90;

/**
 * Minimum confidence to include in suggestions list.
 */
const MIN_SUGGESTION_CONFIDENCE = 50;

/**
 * Maximum number of suggestions to return.
 */
const MAX_SUGGESTIONS = 5;

/**
 * Search for a product by name across Global and Workspace catalogs.
 *
 * @param {string} query            - Raw product name query
 * @param {string|null} workspaceId - Workspace context (null for platform-only search)
 * @param {object} [options]
 * @param {string} [options.productType] - Filter by "medicine" | "otc"
 * @param {number} [options.limit]       - Max candidates per source (default 10)
 * @returns {Promise<SearchResult>}
 */
const search = async (query, workspaceId = null, options = {}) => {
  const { productType, limit = 10 } = options;

  // Step 1 — Normalize
  const normalized = normalizeProductName(query);

  if (!normalized) {
    return {
      matched: false,
      confidence: 0,
      productSource: null,
      productId: null,
      suggestions: [],
    };
  }

  // Step 2 — Search both catalogs in parallel
  const [globalCandidates, workspaceCandidates] = await Promise.all([
    searchGlobalProduct(normalized, { productType, limit }),
    workspaceId
      ? searchWorkspaceProduct(normalized, workspaceId, { productType, limit })
      : Promise.resolve([]),
  ]);

  // Step 3 — Score and rank all candidates
  const suggestions = suggestMatches(
    query,
    globalCandidates,
    workspaceCandidates,
    {
      minConfidence: MIN_SUGGESTION_CONFIDENCE,
      topN: MAX_SUGGESTIONS,
    },
  );

  // Step 4 — Determine if top result is a confident match
  const top = suggestions[0];

  if (top && top.confidence >= CONFIDENT_MATCH_THRESHOLD) {
    return {
      matched: true,
      confidence: top.confidence,
      productSource: top.productSource,
      productId: top.productId,
      productType: top.productType,
      name: top.name,
      suggestions,
    };
  }

  // No confident match — return suggestions for manual selection / workspace product creation
  return {
    matched: false,
    confidence: top?.confidence || 0,
    productSource: null,
    productId: null,
    suggestions,
  };
};

/**
 * Search only in the Global Catalog (Platform use / stock upload).
 *
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<SearchResult>}
 */
const searchGlobal = async (query, options = {}) => {
  return search(query, null, options);
};

/**
 * Search only within a specific workspace's products.
 *
 * @param {string} query
 * @param {string} workspaceId
 * @param {object} [options]
 * @returns {Promise<SearchResult>}
 */
const searchWorkspace = async (query, workspaceId, options = {}) => {
  const normalized = normalizeProductName(query);

  if (!normalized || !workspaceId) {
    return {
      matched: false,
      confidence: 0,
      productSource: null,
      productId: null,
      suggestions: [],
    };
  }

  const workspaceCandidates = await searchWorkspaceProduct(
    normalized,
    workspaceId,
    options,
  );

  const suggestions = suggestMatches(query, [], workspaceCandidates, {
    minConfidence: MIN_SUGGESTION_CONFIDENCE,
    topN: MAX_SUGGESTIONS,
  });

  const top = suggestions[0];

  if (top && top.confidence >= CONFIDENT_MATCH_THRESHOLD) {
    return {
      matched: true,
      confidence: top.confidence,
      productSource: top.productSource,
      productId: top.productId,
      name: top.name,
      suggestions,
    };
  }

  return {
    matched: false,
    confidence: top?.confidence || 0,
    productSource: null,
    productId: null,
    suggestions,
  };
};

export default {
  search,
  searchGlobal,
  searchWorkspace,
};
