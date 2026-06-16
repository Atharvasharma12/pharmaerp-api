/**
 * generateSearchTokens.js
 *
 * Breaks a product name into individual searchable keyword tokens.
 *
 * Example (from gpnotes.md):
 *   "Paracetamol 500mg Tablet"
 *   → ["paracetamol", "500mg", "tablet"]
 *
 * Used to:
 * - Build partial match arrays
 * - Power token-based similarity checks
 * - Feed into suggestMatches for typo-tolerant search
 */

import normalizeProductName from "./normalizeProductName.js";

/**
 * Stopwords to skip — common words that carry no product identity.
 */
const STOPWORDS = new Set([
  "tab",
  "tablet",
  "tablets",
  "cap",
  "capsule",
  "capsules",
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

/**
 * Generate search tokens from a product name.
 *
 * Steps:
 * 1. Normalize the name
 * 2. Split on whitespace
 * 3. Filter out empty strings and very short tokens (< 2 chars)
 * 4. Optionally strip stopwords (dosage forms)
 *
 * @param {string} name - Raw or normalized product name
 * @param {object} options
 * @param {boolean} [options.includeStopwords=false] - Include dosage form words
 * @returns {string[]} Array of lowercase tokens
 */
const generateSearchTokens = (name, options = {}) => {
  const { includeStopwords = false } = options;

  const normalized = normalizeProductName(name);

  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(" ")
    .filter((token) => token.length >= 2)
    .filter((token) => includeStopwords || !STOPWORDS.has(token));

  // De-duplicate tokens while preserving order
  return [...new Set(tokens)];
};

export default generateSearchTokens;
