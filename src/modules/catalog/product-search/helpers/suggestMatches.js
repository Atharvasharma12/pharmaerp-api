/**
 * suggestMatches.js
 *
 * Takes a raw query and a list of product candidates, scores each one
 * using productSimilarity, and returns the top suggestions sorted by
 * confidence descending.
 *
 * Example (from gpnotes.md):
 *   Input:  "PARACITAMOL"
 *   Output:
 *     [
 *       { name: "Paracetamol 500", confidence: 95, productSource: "GLOBAL", productId: "..." },
 *       { name: "Paracetamol 650", confidence: 91, productSource: "GLOBAL", productId: "..." },
 *       { name: "Paracetamol Syrup", confidence: 87, productSource: "GLOBAL", productId: "..." },
 *     ]
 */

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

  const scored = [];

  // Score global candidates
  for (const candidate of globalCandidates) {
    const confidence = productSimilarity(query, candidate.name);

    if (confidence >= minConfidence) {
      scored.push({
        name: candidate.name,
        confidence,
        productSource: PRODUCT_SOURCE.GLOBAL,
        productId: candidate._id,
        productType: candidate.productType,
        globalProductCode: candidate.globalProductCode,
      });
    }
  }

  // Score workspace candidates
  for (const candidate of workspaceCandidates) {
    const confidence = productSimilarity(query, candidate.name);

    if (confidence >= minConfidence) {
      scored.push({
        name: candidate.name,
        confidence,
        productSource: PRODUCT_SOURCE.WORKSPACE,
        productId: candidate._id,
        productType: candidate.productType,
        workspaceProductCode: candidate.workspaceProductCode,
      });
    }
  }

  // Sort descending by confidence, then prefer GLOBAL over WORKSPACE
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Prefer global when equal confidence
    if (a.productSource === PRODUCT_SOURCE.GLOBAL) return -1;
    if (b.productSource === PRODUCT_SOURCE.GLOBAL) return 1;
    return 0;
  });

  return scored.slice(0, topN);
};

export default suggestMatches;
