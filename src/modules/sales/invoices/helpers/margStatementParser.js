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

  // Check for standard Marg bill pattern: P followed by 6-7 digits in col 1
  for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.length >= 2) {
      const cell1 = String(row[1] || "").trim();
      if (/^(P|PW|CN)\d{5,9}$/i.test(cell1)) {
        return true;
      }
    }
  }

  // Check for single-column format: sheet has rows where a 10-digit mobile number appears in a single text column
  let singleColPhoneCount = 0;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i];
    const cells = Array.isArray(row) ? row : Object.values(row || {});
    const nonEmpty = cells.map(c => String(c || "").trim()).filter(Boolean);
    if (nonEmpty.length <= 2 && /\b[6-9]\d{9}\b/.test(nonEmpty.join(" "))) {
      singleColPhoneCount++;
    }
  }

  if (singleColPhoneCount >= 1) {
    return true;
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
 * Checks if a given row represents a Bill/Customer Header row in either:
 * 1. Classic Marg ERP statement format (with Bill No. in cell 1)
 * 2. Single-column or merged cell format (phone number + customer name in the same cell)
 *
 * @param {Array|Object} row
 * @returns {{ isBillRow: boolean, billNo: string|null, isValidMobile: boolean, mobileNumber: string|null, customerName: string|null, rawText: string }}
 */
export const parseMargBillHeader = (row) => {
  const cells = Array.isArray(row) ? row : Object.values(row || {});
  if (!cells || cells.length === 0) {
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  const cell1 = String(cells[1] || "").trim();
  const isMargBillNo = /^(P|PW|CN)\d{4,10}$/i.test(cell1);

  // Concatenate all cells in row to extract text
  const fullDesc = cells.map((c) => String(c || "").trim()).filter(Boolean).join(" ");
  if (!fullDesc) {
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  const upperDesc = fullDesc.toUpperCase();
  // Exclude pharmacy header lines (e.g. store address, email, phone lines of store)
  if (
    upperDesc.includes("PHARMACY") ||
    upperDesc.includes("MARKET") ||
    upperDesc.includes("DISTRICT") ||
    upperDesc.includes("E-MAIL") ||
    upperDesc.includes("SALES STATEMENT") ||
    upperDesc.includes("PAGE NO")
  ) {
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  // Find 10-digit Indian mobile number
  const mobileMatch = fullDesc.match(/\b([6-9]\d{9})\b/);

  if (!mobileMatch) {
    if (isMargBillNo) {
      return {
        isBillRow: true,
        billNo: cell1,
        isValidMobile: false,
        mobileNumber: null,
        customerName: null,
        rawText: fullDesc,
      };
    }
    return { isBillRow: false, billNo: null, isValidMobile: false, mobileNumber: null, customerName: null, rawText: "" };
  }

  const rawMobile = mobileMatch[1];
  const normalizedMobile = normalizeMobileNumber(rawMobile);

  // Extract customer name: text following mobile number or preceding text
  let namePart = fullDesc.slice(mobileMatch.index + 10).trim();

  // Strip trailing amounts (e.g. " 408", " 175", " 248.00")
  namePart = namePart.replace(/\s+\d+(\.\d+)?$/, "").trim();

  // Clean trailing punctuation and symbols
  namePart = namePart.replace(/^[,\s-]+/, "").replace(/[,\s-]+$/, "");

  // If namePart is empty or just numbers, check text before mobile
  if (!namePart || /^\d+$/.test(namePart)) {
    const beforePart = fullDesc.slice(0, mobileMatch.index).trim();
    if (beforePart && !/^(P|PW|CN)?\d+$/i.test(beforePart)) {
      namePart = beforePart;
    }
  }

  const customerName = namePart && namePart.length >= 2 ? namePart : null;

  return {
    isBillRow: true,
    billNo: isMargBillNo ? cell1 : `LEAD-${normalizedMobile}`,
    isValidMobile: !!normalizedMobile,
    mobileNumber: normalizedMobile,
    customerName,
    rawText: fullDesc,
  };
};

/**
 * Checks if a given row represents an item (medicine) row under an active customer.
 * Supports both Marg ERP tabular column 2 and single-column medicine rows.
 *
 * @param {Array|Object} row
 * @returns {boolean}
 */
export const isMargItemRow = (row) => {
  const cells = Array.isArray(row) ? row : Object.values(row || {});
  const nonEmpty = cells.map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpty.length === 0) return false;

  const rowText = nonEmpty.join(" ");

  // If row contains a valid Indian mobile number, it is a customer header, NOT an item row
  if (/\b[6-9]\d{9}\b/.test(rowText)) {
    return false;
  }

  let rawCandidate = "";

  // 1. Classic Marg format: cell0 and cell1 are blank, cell2 has item name
  if (cells.length >= 3 && String(cells[0] || "").trim() === "" && String(cells[1] || "").trim() === "" && String(cells[2] || "").trim() !== "") {
    rawCandidate = String(cells[2]).trim();
  } else if (nonEmpty.length === 1) {
    // 2. Single-column format: cell contains the medicine description
    rawCandidate = nonEmpty[0];
  } else {
    // 3. Multi-cell row without phone number: find the first non-numeric text candidate
    for (const c of nonEmpty) {
      if (!/^\d+(\.\d+)?$/.test(c)) {
        rawCandidate = c;
        break;
      }
    }
  }

  if (!rawCandidate) return false;

  const upper = rawCandidate.toUpperCase();

  // Exclude section titles, headers, totals, doc headers, dates
  if (
    upper.includes("D I S C R I P T I O N") ||
    upper.includes("DESCRIPTION") ||
    upper.includes("TOTAL AMOUNT") ||
    upper.includes("NO,OF,BILLS") ||
    upper.includes("NO OF BILLS") ||
    upper.includes("CONTINUED") ||
    upper.includes("PAGE NO") ||
    upper.includes("BILL NO") ||
    upper.startsWith("SALES STATEMENT") ||
    upper.startsWith("NAME :") ||
    upper.startsWith("DR ") ||
    /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(rawCandidate) || // Date like 09-10-2026
    /^(P|PW|CN)\d{4,10}$/i.test(rawCandidate) ||
    /^(NO|OF|CASH|CREDIT|QTY|BATCH|EXP)$/i.test(upper)
  ) {
    return false;
  }

  return true;
};

/**
 * Extracts raw medicine text from a recognized item row.
 *
 * @param {Array|Object} cells
 * @returns {string}
 */
export const extractMedicineTextFromItemRow = (cells = []) => {
  if (cells.length >= 3 && String(cells[0] || "").trim() === "" && String(cells[1] || "").trim() === "" && String(cells[2] || "").trim() !== "") {
    return String(cells[2]).trim();
  }
  const nonEmpty = cells.map((c) => String(c || "").trim()).filter(Boolean);
  for (const c of nonEmpty) {
    if (!/^\d+(\.\d+)?$/.test(c) && !/\b[6-9]\d{9}\b/.test(c)) {
      return c;
    }
  }
  return nonEmpty[0] || "";
};

/**
 * Transforms an array of Marg ERP statement rows or single-column phone-lead rows
 * into an array of structured B2C legacy customer-medicine records.
 *
 * State machine logic:
 * When a row contains a mobile number -> switches current customer.
 * Subsequent item rows accumulate under that customer until the next customer header.
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

    // 1. Check if row is a Customer/Bill Header (phone number + name)
    const billHeader = parseMargBillHeader(cells);
    if (billHeader.isBillRow) {
      currentBill = billHeader;
      return;
    }

    // 2. Check if row is an Item row under the current customer
    if (isMargItemRow(cells)) {
      const rawMedicine = extractMedicineTextFromItemRow(cells);
      if (!rawMedicine) return;

      const { cleanName } = cleanMedicinePackSuffix(rawMedicine);
      const chosenName = cleanName || rawMedicine;
      const singleSpacedMedicineName = rawMedicine.trim().replace(/[\s\u00A0\t]+/g, " ");

      if (currentBill) {
        if (currentBill.isValidMobile) {
          records.push({
            isValid: true,
            rowNumber,
            customerName: currentBill.customerName,
            mobileNumber: currentBill.mobileNumber,
            medicineName: rawMedicine,
            cleanMedicineName: chosenName,
            singleSpacedMedicineName,
            normalizedMedicineName: normalizeMedicineName(chosenName),
            rawNormalizedMedicineName: normalizeMedicineName(rawMedicine),
            quantity: Number(cells[3]) || 1,
            batch: String(cells[4] || "").trim(),
            billNo: currentBill.billNo,
          });
        } else {
          // Skip record due to invalid mobile on the parent bill
          records.push({
            isValid: false,
            rowNumber,
            skipReason: "INVALID_MOBILE",
            value: currentBill.rawText || "Missing customer mobile on bill header",
          });
        }
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
