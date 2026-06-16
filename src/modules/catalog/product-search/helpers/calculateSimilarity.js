/**
 * calculateSimilarity.js
 *
 * Performs detailed character-level similarity comparison between two strings
 * using the Levenshtein distance algorithm.
 *
 * This is the low-level engine used by productSimilarity.js and suggestMatches.js.
 *
 * Example:
 *   "Paracitamol" vs "Paracetamol" → ~0.91 (91%)
 *   "Dolo" vs "Dolo 650"           → ~0.50 (50%)
 *   "Crocin" vs "Crocin"           → 1.00 (100%)
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Edit distance (lower = more similar)
 */
const levenshteinDistance = (a, b) => {
  const m = a.length;
  const n = b.length;

  // Build a 2D DP matrix
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

/**
 * Calculate similarity ratio between two strings.
 *
 * Returns a value between 0 (no similarity) and 1 (exact match).
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score between 0 and 1
 */
const calculateSimilarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const strA = String(a).toLowerCase().trim();
  const strB = String(b).toLowerCase().trim();

  if (strA === strB) return 1;

  const maxLen = Math.max(strA.length, strB.length);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(strA, strB);

  return parseFloat(((maxLen - distance) / maxLen).toFixed(4));
};

/**
 * Calculate similarity as a percentage (0–100).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Percentage similarity (e.g. 95)
 */
const calculateSimilarityPercent = (a, b) => {
  return Math.round(calculateSimilarity(a, b) * 100);
};

export { calculateSimilarity, calculateSimilarityPercent };

export default calculateSimilarity;
