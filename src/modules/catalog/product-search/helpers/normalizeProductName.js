/**
 * normalizeProductName.js
 *
 * Converts product names into a standard searchable format.
 *
 * Examples (from gpnotes.md):
 *   "DOLO-650"   → "dolo 650"
 *   "dolo 650"   → "dolo 650"
 *   "DOLO 650"   → "dolo 650"
 *   "Paracetamol 500mg Tab." → "paracetamol 500mg tab"
 */

/**
 * Normalize a product name for consistent search comparison.
 *
 * Steps:
 * 1. Trim whitespace
 * 2. Lowercase everything
 * 3. Replace hyphens/underscores with spaces
 * 4. Remove special characters except alphanumeric and spaces
 * 5. Collapse multiple spaces into one
 *
 * @param {string} name - Raw product name
 * @returns {string} Normalized name
 */
const normalizeProductName = (name) => {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, " ")                    // hyphens/underscores → space
    .replace(/[^a-z0-9\s]/g, "")             // remove special chars
    .replace(/\s+/g, " ")                     // collapse multiple spaces
    .trim();
};

export default normalizeProductName;
