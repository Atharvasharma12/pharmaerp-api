/**
 * productSimilarity.js
 *
 * Calculates a match confidence percentage between a query product name
 * and a candidate product name.
 *
 * Example (from gpnotes.md):
 *   query:     "Paracitamol"
 *   candidate: "Paracetamol"
 *   result:    95%
 *
 * Uses a multi-signal approach:
 *   1. Exact match after normalization → 100%
 *   2. Full-string Levenshtein similarity
 *   3. Token overlap score
 *   4. Combined weighted confidence
 */

import normalizeProductName from "./normalizeProductName.js";
import generateSearchTokens from "./generateSearchTokens.js";
import { calculateSimilarityPercent } from "./calculateSimilarity.js";

/**
 * Calculate token overlap ratio between two token arrays.
 *
 * @param {string[]} tokensA
 * @param {string[]} tokensB
 * @returns {number} Overlap score 0–100
 */
const tokenOverlapScore = (tokensA, tokensB) => {
  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let matches = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      matches++;
    }
  }

  const union = new Set([...setA, ...setB]).size;

  return Math.round((matches / union) * 100);
};

/**
 * Calculate product name similarity confidence.
 *
 * Returns a confidence score from 0 to 100.
 *
 * @param {string} query     - The product name being searched
 * @param {string} candidate - The product name being compared against
 * @returns {number} Confidence percentage (0–100)
 */
const productSimilarity = (query, candidate) => {
  if (!query || !candidate) return 0;

  const normalizedQuery = normalizeProductName(query);
  const normalizedCandidate = normalizeProductName(candidate);

  // Exact match after normalization
  if (normalizedQuery === normalizedCandidate) return 100;

  // Substring match (candidate contains full query)
  if (normalizedCandidate.includes(normalizedQuery)) return 92;
  if (normalizedQuery.includes(normalizedCandidate)) return 88;

  // Full-string character-level similarity (weighted 60%)
  const charScore = calculateSimilarityPercent(normalizedQuery, normalizedCandidate);

  // Token overlap similarity (weighted 40%)
  const tokensA = generateSearchTokens(query, { includeStopwords: false });
  const tokensB = generateSearchTokens(candidate, { includeStopwords: false });
  const tokenScore = tokenOverlapScore(tokensA, tokensB);

  // Weighted combined score
  const combined = Math.round(charScore * 0.6 + tokenScore * 0.4);

  return combined;
};

export default productSimilarity;
