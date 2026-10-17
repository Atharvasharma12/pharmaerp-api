/**
 * B2C Legacy Purchase History Row & Field Extractor
 *
 * Implements strict extraction, normalization, and validation rules:
 * - Accepts only valid 10-digit Indian mobile numbers: ^[6-9]\d{9}$
 * - Customer name extraction with strict priority order
 * - Medicine name normalization (trim, collapse spaces, lowercase)
 * - Auto-detects Excel column mappings
 */

/**
 * Mobile number normalizer adhering strictly to the specification.
 *
 * @param {string|number} value
 * @returns {string|null} 10-digit Indian mobile or null if invalid
 */
export const normalizeMobileNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const rawStr = String(value).trim();
  if (!rawStr) return null;

  // Extract all digits
  const digits = rawStr.replace(/\D/g, "");

  let mobile = digits;

  // If 12 digits starting with Indian country code "91", slice the prefix
  if (digits.length === 12 && digits.startsWith("91")) {
    mobile = digits.slice(2);
  }

  // Strict regex: 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return null;
  }

  return mobile;
};

/**
 * Disallowed column patterns that should never be mistaken for customer names.
 */
const EXCLUDED_NAME_PATTERNS = [
  /pharmacy/i,
  /shop/i,
  /store/i,
  /supplier/i,
  /doctor/i,
  /dr\b/i,
  /employee/i,
  /staff/i,
  /gst/i,
  /company/i,
  /business/i,
];

/**
 * Priority order for customer name resolution:
 * Customer Name -> Patient Name -> Buyer Name -> Bill To -> Sold To -> Name
 */
const CUSTOMER_NAME_PRIORITIES = [
  "customer name",
  "customer",
  "patient name",
  "patient",
  "buyer name",
  "buyer",
  "bill to",
  "sold to",
  "name",
];

/**
 * Extracts the customer name from row according to defined priority order.
 *
 * @param {Object} row - Raw row object
 * @param {string} [explicitField] - Optional explicit column name
 * @returns {string|null} Extracted customer name or null
 */
export const extractCustomerName = (row, explicitField = null) => {
  if (!row || typeof row !== "object") return null;

  if (explicitField && row[explicitField] !== undefined && row[explicitField] !== null) {
    const val = String(row[explicitField]).trim();
    return val.length > 0 ? val : null;
  }

  const rowKeys = Object.keys(row);

  for (const priorityLabel of CUSTOMER_NAME_PRIORITIES) {
    // Check exact match (case-insensitive)
    const exactKey = rowKeys.find(
      (k) => k.trim().toLowerCase() === priorityLabel
    );

    if (exactKey) {
      // Check if it matches any excluded patterns
      const isExcluded = EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(exactKey));
      if (!isExcluded) {
        const val = String(row[exactKey] || "").trim();
        if (val.length > 0) return val;
      }
    }

    // Check inclusion match if priority label is multi-word
    if (priorityLabel.includes(" ")) {
      const includeKey = rowKeys.find((k) =>
        k.trim().toLowerCase().includes(priorityLabel)
      );

      if (includeKey) {
        const isExcluded = EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(includeKey));
        if (!isExcluded) {
          const val = String(row[includeKey] || "").trim();
          if (val.length > 0) return val;
        }
      }
    }
  }

  return null;
};

/**
 * Recognized medicine column labels.
 */
const MEDICINE_COLUMNS = [
  "medicine name",
  "medicine",
  "product name",
  "product",
  "item name",
  "item",
  "description",
  "particulars",
  "drug name",
  "drug",
];

/**
 * Normalizes a medicine name for fast and deterministic dictionary lookup.
 * Trims, lowercases, replaces hyphens/underscores with space, collapses spaces.
 *
 * @param {string} name
 * @returns {string} Normalized medicine name
 */
export const normalizeMedicineName = (name) => {
  if (!name || typeof name !== "string") return "";

  // Replace any whitespace (including tabs, non‑breaking spaces) with a single space,
  // then trim, lowercase, replace hyphens/underscores/slashes with space, remove punctuation,
  // and collapse multiple spaces.
  let normalized = name
    .trim()
    .replace(/[\s\u00A0\t]+/g, " ")
    .toLowerCase()
    .replace(/[\-_/]/g, " ")
    .replace(/[\.]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Collapse any leftover multiple spaces and trim again
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
};

/**
 * Extracts medicine name from row object.
 *
 * @param {Object} row
 * @param {string} [explicitField]
 * @returns {string|null}
 */
export const extractMedicineName = (row, explicitField = null) => {
  if (!row || typeof row !== "object") return null;

  if (explicitField && row[explicitField] !== undefined && row[explicitField] !== null) {
    const val = String(row[explicitField]).trim();
    return val.length > 0 ? val : null;
  }

  const rowKeys = Object.keys(row);

  for (const label of MEDICINE_COLUMNS) {
    const exactKey = rowKeys.find((k) => k.trim().toLowerCase() === label);
    if (exactKey) {
      const val = String(row[exactKey] || "").trim();
      if (val.length > 0) return val;
    }
  }

  for (const label of MEDICINE_COLUMNS) {
    const includeKey = rowKeys.find((k) =>
      k.trim().toLowerCase().includes(label)
    );
    if (includeKey) {
      const val = String(row[includeKey] || "").trim();
      if (val.length > 0) return val;
    }
  }

  return null;
};

/**
 * Extracts raw mobile number string from row.
 *
 * @param {Object} row
 * @param {string} [explicitField]
 * @returns {string|null}
 */
export const extractRawMobile = (row, explicitField = null) => {
  if (!row || typeof row !== "object") return null;

  if (explicitField && row[explicitField] !== undefined && row[explicitField] !== null) {
    const val = String(row[explicitField]).trim();
    return val.length > 0 ? val : null;
  }

  const rowKeys = Object.keys(row);
  const mobileLabels = [
    "mobile number",
    "mobile",
    "contact number",
    "contact",
    "phone number",
    "phone",
    "cell",
  ];

  for (const label of mobileLabels) {
    const matchedKey = rowKeys.find((k) => k.trim().toLowerCase() === label);
    if (matchedKey) {
      const val = String(row[matchedKey] || "").trim();
      if (val.length > 0) return val;
    }
  }

  for (const label of mobileLabels) {
    const matchedKey = rowKeys.find((k) =>
      k.trim().toLowerCase().includes(label)
    );
    if (matchedKey) {
      const val = String(row[matchedKey] || "").trim();
      if (val.length > 0) return val;
    }
  }

  return null;
};

/**
 * Detects appropriate column mappings from an array of header strings.
 *
 * @param {string[]} headers
 * @returns {{ customerNameField: string|null, mobileNumberField: string|null, medicineField: string|null }}
 */
export const detectColumnMapping = (headers = []) => {
  const dummyRow = {};
  for (const h of headers) {
    if (h) dummyRow[String(h).trim()] = "sample";
  }

  let customerNameField = null;
  let mobileNumberField = null;
  let medicineField = null;

  const headerList = headers.map((h) => String(h || "").trim()).filter(Boolean);

  // 1. Mobile field
  const mobileLabels = ["mobile number", "mobile", "contact number", "contact", "phone number", "phone"];
  for (const label of mobileLabels) {
    const found = headerList.find((h) => h.toLowerCase() === label);
    if (found) {
      mobileNumberField = found;
      break;
    }
  }
  if (!mobileNumberField) {
    for (const label of mobileLabels) {
      const found = headerList.find((h) => h.toLowerCase().includes(label));
      if (found) {
        mobileNumberField = found;
        break;
      }
    }
  }

  // 2. Customer Name field
  for (const label of CUSTOMER_NAME_PRIORITIES) {
    const found = headerList.find((h) => h.toLowerCase() === label);
    if (found) {
      const isExcluded = EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(found));
      if (!isExcluded) {
        customerNameField = found;
        break;
      }
    }
  }
  if (!customerNameField) {
    for (const label of CUSTOMER_NAME_PRIORITIES) {
      const found = headerList.find((h) => h.toLowerCase().includes(label));
      if (found) {
        const isExcluded = EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(found));
        if (!isExcluded) {
          customerNameField = found;
          break;
        }
      }
    }
  }

  // 3. Medicine field
  for (const label of MEDICINE_COLUMNS) {
    const found = headerList.find((h) => h.toLowerCase() === label);
    if (found) {
      medicineField = found;
      break;
    }
  }
  if (!medicineField) {
    for (const label of MEDICINE_COLUMNS) {
      const found = headerList.find((h) => h.toLowerCase().includes(label));
      if (found) {
        medicineField = found;
        break;
      }
    }
  }

  return {
    customerNameField,
    mobileNumberField,
    medicineField,
  };
};

/**
 * Extracts and validates a single row for B2C legacy import.
 *
 * @param {Object} row - Raw row object
 * @param {number} rowNumber - 1-indexed row number in the file
 * @param {Object} [columnMapping] - Optional column mappings
 * @returns {Object} Extracted row descriptor
 */
export const extractB2CLegacyRow = (row, rowNumber, columnMapping = {}) => {
  if (!row || typeof row !== "object" || Object.keys(row).length === 0) {
    return {
      isValid: false,
      rowNumber,
      skipReason: "EMPTY_ROW",
      value: "",
    };
  }

  const rawMobile = extractRawMobile(row, columnMapping.mobileNumberField);

  if (!rawMobile) {
    return {
      isValid: false,
      rowNumber,
      skipReason: "MISSING_MOBILE",
      value: "",
    };
  }

  const mobileNumber = normalizeMobileNumber(rawMobile);
  if (!mobileNumber) {
    return {
      isValid: false,
      rowNumber,
      skipReason: "INVALID_MOBILE",
      value: rawMobile,
    };
  }

  const rawMedicine = extractMedicineName(row, columnMapping.medicineField);
  if (!rawMedicine) {
    return {
      isValid: false,
      rowNumber,
      skipReason: "MISSING_MEDICINE",
      value: "",
    };
  }

  const normalizedMedicineName = normalizeMedicineName(rawMedicine);
  if (!normalizedMedicineName) {
    return {
      isValid: false,
      rowNumber,
      skipReason: "MISSING_MEDICINE",
      value: rawMedicine,
    };
  }

  const customerName = extractCustomerName(row, columnMapping.customerNameField);

  return {
    isValid: true,
    rowNumber,
    customerName,
    mobileNumber,
    medicineName: rawMedicine,
    normalizedMedicineName,
  };
};
