import Fuse from "fuse.js";
import productSimilarity from "./productSimilarity.js";

const PRODUCT_SOURCE = {
  GLOBAL: "GLOBAL",
  WORKSPACE: "WORKSPACE",
};

/**
 * Score and rank candidates against a query.
 *
 * @param {string} query         - The original product name query
 * @param {Array}  globalCandidates   - Results from searchGlobalProduct (lean docs)
 * @param {Array}  workspaceCandidates - Results from searchWorkspaceProduct (lean docs)
 * @param {object} [options]
 * @param {number} [options.minConfidence=50]  - Minimum confidence threshold to include
 * @param {number} [options.topN=5]            - Maximum suggestions to return
 * @returns {Array<{name, confidence, productSource, productId, productType}>}
 */
const suggestMatches = (
  query,
  globalCandidates = [],
  workspaceCandidates = [],
  options = {},
) => {
  const { minConfidence = 50, topN = 5 } = options;

  // Format and combine candidates
  const candidates = [
    ...globalCandidates.map((c) => ({
      ...c,
      productSource: PRODUCT_SOURCE.GLOBAL,
    })),
    ...workspaceCandidates.map((c) => ({
      ...c,
      productSource: PRODUCT_SOURCE.WORKSPACE,
    })),
  ];

  if (candidates.length === 0) {
    return [];
  }

  // Initialize Fuse.js on candidates
  const fuse = new Fuse(candidates, {
    keys: ["name"],
    includeScore: true,
    threshold: 0.5, // Allow fuzzy matching
  });

  const fuseResults = fuse.search(query);

  const scored = fuseResults.map((result) => {
    const candidate = result.item;

    // Calculate character/token similarity using the robust productSimilarity helper
    // as it combines char similarity (now via Fuse) and token overlaps.
    const confidence = productSimilarity(query, candidate.name);

    return {
      name: candidate.name,
      confidence,
      productSource: candidate.productSource,
      productId: candidate._id,
      productType: candidate.productType,
      globalProductCode: candidate.globalProductCode,
      workspaceProductCode: candidate.workspaceProductCode,
    };
  });

  // Sort descending by confidence, then prefer GLOBAL over WORKSPACE on equal score
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    if (a.productSource === PRODUCT_SOURCE.GLOBAL) return -1;
    if (b.productSource === PRODUCT_SOURCE.GLOBAL) return 1;
    return 0;
  });

  // Filter and limit
  return scored
    .filter((match) => match.confidence >= minConfidence)
    .slice(0, topN);
};

export default suggestMatches;
