/**
 * Generates uppercase branch initials from a branch name or branch object.
 *
 * Rules:
 * - Multi-word: First character of each word in uppercase (e.g., "Vikas Retail" -> "VR", "Main Branch" -> "MB", "City Care Pharmacy" -> "CCP", max 4 chars).
 * - Single-word: First 2 to 3 characters in uppercase (e.g., "Apollo" -> "APO", "Downtown" -> "DOW", "Store" -> "STO").
 * - Fallback: "BR" if name is missing or empty.
 *
 * @param {string|object} branchOrName
 * @returns {string} Uppercase initials
 */
export const getBranchInitials = (branchOrName) => {
  if (!branchOrName) return "BR";

  let rawName = "";
  if (typeof branchOrName === "string") {
    rawName = branchOrName;
  } else if (typeof branchOrName === "object") {
    rawName = branchOrName.name || branchOrName.branchName || "";
  }

  const clean = String(rawName).trim().replace(/[^a-zA-Z0-9\s]/g, "");
  if (!clean) return "BR";

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BR";

  if (words.length === 1) {
    const singleWord = words[0].toUpperCase();
    return singleWord.length <= 3 ? singleWord : singleWord.slice(0, 3);
  }

  const initials = words
    .slice(0, 4)
    .map((w) => w[0].toUpperCase())
    .join("");

  return initials || "BR";
};

export default getBranchInitials;
