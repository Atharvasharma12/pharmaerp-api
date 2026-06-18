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
import GlobalProduct from "../../../platform/global-catalog/products/models/globalProduct.model.js";
import WorkspaceProduct from "../../products/models/workspaceProduct.model.js";

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
 * Stopwords to skip/make optional in exact match regex
 */
const STOPWORDS = new Set([
  "tab",
  "tablet",
  "tablets",
  "tabs",
  "cap",
  "capsule",
  "capsules",
  "caps",
  "syrup",
  "injection",
  "inj",
  "cream",
  "gel",
  "drops",
  "solution",
  "suspension",
  "powder",
  "sachet",
  "ointment",
  "lotion",
  "spray",
]);

const OPTIONAL_STOPWORDS_PATTERN = "(?:[\\s_-]*(?:tab|tablet|tablets|tabs|cap|capsule|capsules|caps|syrup|injection|inj|cream|gel|drops|solution|suspension|powder|sachet|ointment|lotion|spray))?";

/**
 * Helper to normalize name specifically for exact spacing/case lookup
 */
const normalizeForExactLookup = (name) => {
  const normalized = normalizeProductName(name);
  if (!normalized) return "";
  // Split transitions between letters and numbers so that spacing differences match exactly
  return normalized
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2");
};

/**
 * Perform Layer 2: Exact normalized lookup (cross-type)
 */
const findExactNormalizedMatch = async (normalizedQuery, workspaceId) => {
  const exactLookupName = normalizeForExactLookup(normalizedQuery);
  if (!exactLookupName) return null;

  // Build a regex that matches exactly after ignoring spaces/hyphens/underscores
  // Filter out stopwords from the query so they are matched by the optional trailing pattern instead
  const tokens = exactLookupName
    .split(" ")
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
    
  if (tokens.length === 0) return null;

  const pattern = "^" + tokens.map((t) => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")).join("[\\s_-]*") + OPTIONAL_STOPWORDS_PATTERN + "$";
  const regex = new RegExp(pattern, "i");

  const filter = {
    isDeleted: false,
    status: "active",
    name: { $regex: regex },
  };

  // Layer 2a: Try Workspace matches first
  if (workspaceId) {
    const wsMatch = await WorkspaceProduct.findOne({
      ...filter,
      workspaceId,
    })
      .populate("HsnMaster", "code description gstRate cessRate isActive")
      .lean();

    if (wsMatch) {
      return {
        matched: true,
        confidence: 100,
        productSource: "WORKSPACE",
        productId: wsMatch._id,
        productType: wsMatch.productType,
        name: wsMatch.name,
        suggestions: [],
      };
    }
  }

  // Layer 2b: Try Global matches
  const globalMatch = await GlobalProduct.findOne(filter)
    .populate("HsnMaster", "code description gstRate cessRate isActive")
    .lean();

  if (globalMatch) {
    return {
      matched: true,
      confidence: 100,
      productSource: "GLOBAL",
      productId: globalMatch._id,
      productType: globalMatch.productType,
      name: globalMatch.name,
      suggestions: [],
    };
  }

  return null;
};

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

  // Layer 1 — Normalize
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

  // Layer 2 — Exact normalized lookup (case/space/hyphen/stopword tolerant, cross-type)
  const exactMatch = await findExactNormalizedMatch(normalized, workspaceId);
  if (exactMatch) {
    return exactMatch;
  }

  // Layer 3 — Fuse.js for near matches (exact lookup failed)
  // Retrieve candidate lists from both databases
  const [globalCandidates, workspaceCandidates] = await Promise.all([
    // Fetch global candidates using text index or regex fallback (avoid loading entire global catalog)
    searchGlobalProduct(normalized, { limit }),
    
    // Fetch all active workspace products to ensure we match spelling typos against all workspace products
    workspaceId
      ? WorkspaceProduct.find({
          workspaceId,
          isDeleted: false,
          status: "active",
        })
          .select("name workspaceProductCode productType manufacturer")
          .lean()
      : Promise.resolve([]),
  ]);

  // Score and rank candidates using Fuse.js inside suggestMatches
  const suggestions = suggestMatches(
    query,
    globalCandidates,
    workspaceCandidates,
    {
      minConfidence: MIN_SUGGESTION_CONFIDENCE,
      topN: MAX_SUGGESTIONS,
    },
  );

  // Layer 4 — Similarity threshold check
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

  // Layer 2 exact check
  const exactMatch = await findExactNormalizedMatch(normalized, workspaceId);
  if (exactMatch && exactMatch.productSource === "WORKSPACE") {
    return exactMatch;
  }

  // Layer 3
  const workspaceCandidates = await WorkspaceProduct.find({
    workspaceId,
    isDeleted: false,
    status: "active",
  })
    .select("name workspaceProductCode productType manufacturer")
    .lean();

  const suggestions = suggestMatches(query, [], workspaceCandidates, {
    minConfidence: MIN_SUGGESTION_CONFIDENCE,
    topN: MAX_SUGGESTIONS,
  });

  // Layer 4
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
