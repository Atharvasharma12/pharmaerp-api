/**
 * Phone Number & Customer Deduplication / Shared-Contact Relationship Helpers
 */

export const RELATION_HIERARCHY = [
  "Self",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Other",
];

const PLACEHOLDER_VALUES = new Set([
  "",
  "n/a",
  "na",
  "-",
  "--",
  "---",
  "nil",
  "null",
  "none",
  "undefined",
  "0",
  "0000000000",
]);

/**
 * Normalizes Indian phone numbers according to the standard rules.
 * Accepts formats: 9876543210, +91 9876543210, +91-9876543210, 09876543210, 919876543210.
 * Returns a 10-digit string starting with 6-9, or null if invalid or placeholder.
 */
export const normalizeIndianPhone = (phone) => {
  if (phone === null || phone === undefined) return null;

  const raw = String(phone).trim();
  const lower = raw.toLowerCase();

  if (PLACEHOLDER_VALUES.has(lower)) {
    return null;
  }

  // Remove common separators and non-digit characters
  const digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  let normalized = null;

  // Handle standard 10-digit number
  if (digits.length === 10) {
    normalized = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // 09876543210
    normalized = digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // 919876543210 or +919876543210
    normalized = digits.substring(2);
  }

  if (normalized && /^[6-9][0-9]{9}$/.test(normalized)) {
    return normalized;
  }

  return null;
};

/**
 * Validates if the given string is a valid 10-digit Indian mobile number starting with 6-9.
 */
export const isValidIndianMobile = (normalizedPhone) => {
  if (!normalizedPhone || typeof normalizedPhone !== "string") return false;
  return /^[6-9][0-9]{9}$/.test(normalizedPhone);
};

/**
 * Normalizes customer name for strict duplicate comparison.
 * Trims, lowercases, and collapses multiple whitespace characters.
 */
export const normalizeCustomerName = (name) => {
  if (!name) return "";
  return String(name).toLowerCase().replace(/\s+/g, " ").trim();
};

/**
 * Returns default relationship by order position in shared contact group:
 * 0 (1st customer): Self
 * 1 (2nd customer): Father
 * 2 (3rd customer): Mother
 * 3 (4th customer): Brother
 * 4 (5th customer): Sister
 * 5 (6th customer): Son
 * 6 (7th customer): Daughter
 * 7+ (8th onwards): Other
 */
export const getDefaultRelationForPosition = (positionIndex) => {
  if (positionIndex < 0) return "Other";
  if (positionIndex < RELATION_HIERARCHY.length) {
    return RELATION_HIERARCHY[positionIndex];
  }
  return "Other";
};

/**
 * Computes reciprocal relationship from Customer B's perspective given Customer A's relation.
 * If gender information is unavailable, defaults to "Other" as mandated by Section 14.B.
 *
 * @param {string} relation - Relationship of B from A's perspective
 * @param {object} options - { isSameCustomer, targetGender }
 * @returns {string} - Reciprocal relationship from B's perspective
 */
export const getReciprocalRelation = (relation, options = {}) => {
  const { isSameCustomer = false, targetGender = null } = options;

  if (isSameCustomer) {
    return "Self";
  }

  const gender = (targetGender || "").toLowerCase();

  switch (relation) {
    case "Father":
    case "Mother":
      // A is Father/Mother to B. So from B's perspective, A is Son or Daughter based on A's gender.
      if (gender === "male") return "Son";
      if (gender === "female") return "Daughter";
      return "Other";

    case "Son":
    case "Daughter":
      // A is Son/Daughter to B. So from B's perspective, A is Father or Mother based on A's gender.
      if (gender === "male") return "Father";
      if (gender === "female") return "Mother";
      return "Other";

    case "Brother":
    case "Sister":
      if (gender === "male") return "Brother";
      if (gender === "female") return "Sister";
      return "Other";

    case "Spouse":
      return "Spouse";

    case "Self":
      return isSameCustomer ? "Self" : "Other";

    case "Other":
    default:
      return "Other";
  }
};
