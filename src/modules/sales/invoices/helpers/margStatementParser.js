import {
  normalizeMobileNumber,
  normalizeMedicineName,
} from "./b2cLegacyExtractor.js";

/**
 * Detects whether the parsed sheet rows match the Marg ERP Sales Statement format.
 *
 * @param {Array<Array|Object>} rows - Sample raw rows
 * @returns {boolean} True if Marg ERP format is detected
 */
export const isMargStatement = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    const rowText = Array.isArray(row)
      ? row.join(" ").toUpperCase()
      : typeof row === "object"
      ? Object.values(row).join(" ").toUpperCase()
      : String(row || "").toUpperCase();

    if (rowText.includes("SALES STATEMENT") || rowText.includes("MARG ERP")) {
      return true;
    }

    if (
      (rowText.includes("BILL NO") || rowText.includes("BILL NO.")) &&
      (rowText.includes("DESCRIPTION") || rowText.includes("D I S C R I P T I O N"))
    ) {
      return true;
    }
  }

  // Also check for standard Marg bill pattern: P followed by 6-7 digits in col 1
  for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.length >= 2) {
      const cell1 = String(row[1] || "").trim();
      if (/^(P|PW|CN)\d{5,9}$/i.test(cell1)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Strips fixed-width pack suffix (e.g. "10*", "10X15", "1*10", "15S", "100ML")
 * from Marg ERP medicine description string.
 *
 * @param {string} rawMedicine - e.g. "LABETAMAC TAB        10*"
 * @returns {{ cleanName: string, pack: string }}
 */
export const cleanMedicinePackSuffix = (rawMedicine) => {
  if (!rawMedicine || typeof rawMedicine !== "string") {
    return { cleanName: "", pack: "" };
  }

  const trimmed = rawMedicine.trim();

  // In Marg ERP, 2 or more spaces usually separate the drug name from pack string
  const spaceParts = trimmed.split(/\s{2,}/);
  if (spaceParts.length >= 2) {
    const cleanName = spaceParts[0].trim();
    const pack = spaceParts.slice(1).join(" ").trim();
    if (cleanName.length > 0) {
      return { cleanName, pack };
    }
  }

  // Regex fallback: trailing pack like "10S", "10*15", "1X10tab", "1X20TAB.", "100ML", "50GM"
  const packRegex = /\s+(\d+[*xX]\d+[a-zA-Z.]*|\d+[sStT]|\d+\s*ML|\d+\s*GM|\d+\s*MG|TAB\.|CAP\.)$/i;
  const match = trimmed.match(packRegex);
  if (match) {
    const cleanName = trimmed.slice(0, match.index).trim();
    const pack = match[0].trim();
    if (cleanName.length > 0) {
      return { cleanName, pack };
    }
  }

  return { cleanName: trimmed, pack: "" };
};

/**
 * Checks if a given row represents a Bill Header row in Marg ERP statement.
 *
 * @param {Array|Object} row
 * @returns {{ isBillRow: boolean, billNo: string|null, isValidMobile: boolean, mobileNumber: string|null, customerName: string|null, rawText: string }}
 */
export const parseMargBillHeader = (row) => {
  const cells = Array.isArray(row) ? row : Object.values(row || {});

  if (cells.length < 2) {
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  const cell1 = String(cells[1] || "").trim();

  // Marg bill numbers usually start with P, PW, CN or digits
  const isBillNo = /^(P|PW|CN)\d{4,10}$/i.test(cell1);

  if (!isBillNo) {
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  // Concatenate description cells up to cash/credit amount columns
  const descCells = cells.slice(2).map((c) => String(c || "").trim()).filter(Boolean);
  const fullDesc = descCells.join(" ");

  // Find 10-digit Indian mobile number
  const mobileMatch = fullDesc.match(/\b([6-9]\d{9})\b/);

  if (!mobileMatch) {
    return {
      isBillRow: true,
      billNo: cell1,
      isValidMobile: false,
      mobileNumber: null,
      customerName: null,
      rawText: fullDesc,
    };
  }

  const rawMobile = mobileMatch[1];
  const normalizedMobile = normalizeMobileNumber(rawMobile);

  // Extract name: text following mobile number or preceding text
  let namePart = fullDesc.slice(mobileMatch.index + 10).trim();

  // Strip trailing amounts (e.g. " 408", " 175", " 248.00")
  namePart = namePart.replace(/\s+\d+(\.\d+)?$/, "").trim();

  // Clean trailing punctuation
  namePart = namePart.replace(/^[,\s-]+/, "").replace(/[,\s-]+$/, "");

  // If namePart is empty or just numbers, check text before mobile
  if (!namePart || /^\d+$/.test(namePart)) {
    const beforePart = fullDesc.slice(0, mobileMatch.index).trim();
    if (beforePart && !/^\d+$/.test(beforePart)) {
      namePart = beforePart;
    }
  }

  const customerName = namePart && namePart.length >= 2 ? namePart : null;

  return {
    isBillRow: true,
    billNo: cell1,
    isValidMobile: !!normalizedMobile,
    mobileNumber: normalizedMobile,
    customerName,
    rawText: fullDesc,
  };
};

/**
 * Checks if a given row represents an item (medicine) row under a bill.
 *
 * @param {Array|Object} row
 * @returns {boolean}
 */
export const isMargItemRow = (row) => {
  const cells = Array.isArray(row) ? row : Object.values(row || {});
  if (cells.length < 3) return false;

  const cell0 = String(cells[0] || "").trim();
  const cell1 = String(cells[1] || "").trim();
  const cell2 = String(cells[2] || "").trim();

  // In Marg ERP, item rows have empty cell 0 and cell 1, with item in cell 2
  if (cell0 !== "" || cell1 !== "") {
    return false;
  }

  if (!cell2) return false;

  const upper = cell2.toUpperCase();

  // Exclude section titles, headers, totals
  if (
    upper.includes("D I S C R I P T I O N") ||
    upper.includes("TOTAL AMOUNT") ||
    upper.includes("NO,OF,BILLS") ||
    upper.includes("NO OF BILLS") ||
    upper.includes("CONTINUED") ||
    upper.includes("PAGE NO") ||
    upper.startsWith("SALES STATEMENT") ||
    upper.startsWith("NAME :") ||
    upper.startsWith("DR ")
  ) {
    return false;
  }

  return true;
};

/**
 * Transforms an array of Marg ERP statement rows into an array of structured
 * B2C legacy customer-medicine records.
 *
 * @param {Array<Array|Object>} rows - All raw rows in sheet
 * @returns {Array<Object>} Extracted rows ready for staging
 */
export const transformMargStatementRows = (rows = []) => {
  const records = [];
  let currentBill = null;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const cells = Array.isArray(row) ? row : Object.values(row || {});

    // 1. Check if row is a Bill Header
    const billHeader = parseMargBillHeader(cells);
    if (billHeader.isBillRow) {
      currentBill = billHeader;
      return;
    }

    // 2. Check if row is an Item row
    if (isMargItemRow(cells)) {
      const rawMedicine = String(cells[2] || "").trim();
      const { cleanName } = cleanMedicinePackSuffix(rawMedicine);
      const chosenName = cleanName || rawMedicine;

      if (currentBill && currentBill.isValidMobile) {
        records.push({
          isValid: true,
          rowNumber,
          customerName: currentBill.customerName,
          mobileNumber: currentBill.mobileNumber,
          medicineName: rawMedicine,
          cleanMedicineName: chosenName,
          normalizedMedicineName: normalizeMedicineName(chosenName),
          rawNormalizedMedicineName: normalizeMedicineName(rawMedicine),
          quantity: Number(cells[3]) || 1,
          batch: String(cells[4] || "").trim(),
          billNo: currentBill.billNo,
        });
      } else {
        // Skip record due to invalid or missing mobile on the parent bill
        records.push({
          isValid: false,
          rowNumber,
          skipReason: "INVALID_MOBILE",
          value: currentBill?.rawText || "Missing customer mobile on bill header",
        });
      }
      return;
    }

    // 3. Reset bill on section boundaries or totals if needed
    const joined = cells.join(" ").toUpperCase();
    if (joined.includes("NO,OF,BILLS") || joined.includes("TOTAL AMOUNT")) {
      currentBill = null;
    }
  });

  return records;
};
