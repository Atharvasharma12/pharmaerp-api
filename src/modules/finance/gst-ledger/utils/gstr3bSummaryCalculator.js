/**
 * GSTR-3B Summary Calculator for Backend
 * Computes Section 3.1 (Outward supplies), Section 4 (Eligible ITC),
 * Tax Liability with statutory set-off rules, Summary Cards, and Reconciliation.
 */

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

const createEmptySectionRow = (code, description) => ({
  code,
  description,
  taxable: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  totalTax: 0,
  voucherCount: 0,
  voucherIds: [],
});

const createEmptyItcRow = (code, description) => ({
  code,
  description,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  totalItc: 0,
  voucherCount: 0,
  voucherIds: [],
});

const addRowValues = (target, src, factor = 1) => {
  const taxable = Number(src.taxableAmount || src.taxable || 0);
  const igst = Number(src.igst || 0);
  const cgst = Number(src.cgst || 0);
  const sgst = Number(src.sgst || 0);
  const cess = Number(src.cess || 0);

  target.taxable = round2(target.taxable + factor * taxable);
  target.igst = round2(target.igst + factor * igst);
  target.cgst = round2(target.cgst + factor * cgst);
  target.sgst = round2(target.sgst + factor * sgst);
  target.cess = round2(target.cess + factor * cess);
  target.totalTax = round2(target.igst + target.cgst + target.sgst + target.cess);
  target.voucherCount += 1;
  if (src._id || src.voucherId || src.voucherNumber) {
    target.voucherIds.push(String(src._id || src.voucherId || src.voucherNumber));
  }
};

const addItcRowValues = (target, src, factor = 1) => {
  const igst = Number(src.igst || 0);
  const cgst = Number(src.cgst || 0);
  const sgst = Number(src.sgst || 0);
  const cess = Number(src.cess || 0);

  target.igst = round2(target.igst + factor * igst);
  target.cgst = round2(target.cgst + factor * cgst);
  target.sgst = round2(target.sgst + factor * sgst);
  target.cess = round2(target.cess + factor * cess);
  target.totalItc = round2(target.igst + target.cgst + target.sgst + target.cess);
  target.voucherCount += 1;
  if (src._id || src.voucherId || src.voucherNumber) {
    target.voucherIds.push(String(src._id || src.voucherId || src.voucherNumber));
  }
};

/**
 * Deduce GSTR-1 group classification for outward supplies
 */
export const classifyGstr1Entry = (entry) => {
  const groupDesc = String(entry?.groupDescription || "").trim().toUpperCase();
  const narration = String(entry?.narration || "").toUpperCase();
  const rawDocType = String(entry?.documentType || entry?.voucherType || entry?.type || "").toUpperCase();

  const isExport = entry?.isExport || rawDocType.includes("EXPORT") || narration.includes("EXPORT") || groupDesc.includes("EXPORT");
  if (isExport) {
    return "3.1(b)";
  }

  const isNilRated = entry?.isNilRated || entry?.taxRate === 0 || narration.includes("NIL RATED") || groupDesc === "NIL RATED";
  const isExempt = entry?.isExempt || narration.includes("EXEMPT") || groupDesc === "EXEMPTED";
  if (isNilRated || isExempt) {
    return "3.1(c)";
  }

  const isNonGst = entry?.isNonGst || narration.includes("NON-GST") || narration.includes("NON GST");
  if (isNonGst) {
    return "3.1(e)";
  }

  // Credit Note / Return adjustment
  const isCreditNote = rawDocType.includes("CREDIT_NOTE") || narration.includes("CREDIT NOTE") || groupDesc.includes("CREDIT NOTE");
  if (isCreditNote) {
    return "3.1(a)_CREDIT_NOTE";
  }

  return "3.1(a)";
};

/**
 * Deduce GSTR-2 ITC classification for inward supplies
 */
export const classifyGstr2Entry = (entry) => {
  const narration = String(entry?.narration || "").toUpperCase();
  const rawDocType = String(entry?.documentType || entry?.voucherType || entry?.type || "").toUpperCase();
  const groupDesc = String(entry?.groupDescription || "").toUpperCase();

  if (entry?.isImportGoods || narration.includes("IMPORT GOODS") || narration.includes("IMPORT OF GOODS")) {
    return "4(A)(1)";
  }
  if (entry?.isImportServices || narration.includes("IMPORT SERVICE") || narration.includes("IMPORT OF SERVICES")) {
    return "4(A)(2)";
  }
  if (entry?.isRcm || rawDocType.includes("RCM") || narration.includes("RCM") || narration.includes("REVERSE CHARGE")) {
    return "4(A)(3)";
  }
  if (entry?.isIsd || rawDocType.includes("ISD") || narration.includes("ISD")) {
    return "4(A)(4)";
  }

  // Reversals
  if (entry?.isItcReversal || narration.includes("ITC REVERSAL") || groupDesc.includes("REVERSAL")) {
    if (narration.includes("17(5)") || narration.includes("RULE 38") || narration.includes("RULE 42")) {
      return "4(B)(1)";
    }
    return "4(B)(2)";
  }

  return "4(A)(5)";
};

/**
 * Calculate standard GST Set-Off (Utilization of ITC against Output Liability)
 * Follows Rule 88A:
 * 1. IGST ITC is utilized first towards IGST liability, then towards CGST and SGST in any order.
 * 2. CGST ITC is utilized towards CGST liability first, then towards IGST liability (never SGST).
 * 3. SGST ITC is utilized towards SGST liability first, then towards IGST liability (never CGST).
 * 4. Cess ITC is utilized only towards Cess liability.
 * 5. Reverse charge liability CANNOT be paid through ITC; must be paid in cash.
 */
export const calculateGstSetOff = (outputTax, rcmTax, netItc) => {
  let remIgstLiab = Math.max(0, outputTax.igst);
  let remCgstLiab = Math.max(0, outputTax.cgst);
  let remSgstLiab = Math.max(0, outputTax.sgst);
  let remCessLiab = Math.max(0, outputTax.cess);

  let remIgstItc = Math.max(0, netItc.igst);
  let remCgstItc = Math.max(0, netItc.cgst);
  let remSgstItc = Math.max(0, netItc.sgst);
  let remCessItc = Math.max(0, netItc.cess);

  const itcUtilized = {
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0,
    total: 0,
  };

  // 1. IGST ITC against IGST liability
  const igstAgainstIgst = Math.min(remIgstItc, remIgstLiab);
  itcUtilized.igst = round2(itcUtilized.igst + igstAgainstIgst);
  remIgstItc = round2(remIgstItc - igstAgainstIgst);
  remIgstLiab = round2(remIgstLiab - igstAgainstIgst);

  // Remaining IGST ITC against CGST liability
  const igstAgainstCgst = Math.min(remIgstItc, remCgstLiab);
  itcUtilized.cgst = round2(itcUtilized.cgst + igstAgainstCgst);
  remIgstItc = round2(remIgstItc - igstAgainstCgst);
  remCgstLiab = round2(remCgstLiab - igstAgainstCgst);

  // Remaining IGST ITC against SGST liability
  const igstAgainstSgst = Math.min(remIgstItc, remSgstLiab);
  itcUtilized.sgst = round2(itcUtilized.sgst + igstAgainstSgst);
  remIgstItc = round2(remIgstItc - igstAgainstSgst);
  remSgstLiab = round2(remSgstLiab - igstAgainstSgst);

  // 2. CGST ITC against remaining CGST liability
  const cgstAgainstCgst = Math.min(remCgstItc, remCgstLiab);
  itcUtilized.cgst = round2(itcUtilized.cgst + cgstAgainstCgst);
  remCgstItc = round2(remCgstItc - cgstAgainstCgst);
  remCgstLiab = round2(remCgstLiab - cgstAgainstCgst);

  // Remaining CGST ITC against remaining IGST liability
  const cgstAgainstIgst = Math.min(remCgstItc, remIgstLiab);
  itcUtilized.igst = round2(itcUtilized.igst + cgstAgainstIgst);
  remCgstItc = round2(remCgstItc - cgstAgainstIgst);
  remIgstLiab = round2(remIgstLiab - cgstAgainstIgst);

  // 3. SGST ITC against remaining SGST liability
  const sgstAgainstSgst = Math.min(remSgstItc, remSgstLiab);
  itcUtilized.sgst = round2(itcUtilized.sgst + sgstAgainstSgst);
  remSgstItc = round2(remSgstItc - sgstAgainstSgst);
  remSgstLiab = round2(remSgstLiab - sgstAgainstSgst);

  // Remaining SGST ITC against remaining IGST liability
  const sgstAgainstIgst = Math.min(remSgstItc, remIgstLiab);
  itcUtilized.igst = round2(itcUtilized.igst + sgstAgainstIgst);
  remSgstItc = round2(remSgstItc - sgstAgainstIgst);
  remIgstLiab = round2(remIgstLiab - sgstAgainstIgst);

  // 4. Cess ITC against Cess liability
  const cessAgainstCess = Math.min(remCessItc, remCessLiab);
  itcUtilized.cess = round2(itcUtilized.cess + cessAgainstCess);
  remCessItc = round2(remCessItc - cessAgainstCess);
  remCessLiab = round2(remCessLiab - cessAgainstCess);

  itcUtilized.total = round2(itcUtilized.igst + itcUtilized.cgst + itcUtilized.sgst + itcUtilized.cess);

  // Cash payable = Remaining Output Liability + RCM Liability
  const cashPayable = {
    igst: round2(remIgstLiab + (rcmTax.igst || 0)),
    cgst: round2(remCgstLiab + (rcmTax.cgst || 0)),
    sgst: round2(remSgstLiab + (rcmTax.sgst || 0)),
    cess: round2(remCessLiab + (rcmTax.cess || 0)),
  };
  cashPayable.total = round2(cashPayable.igst + cashPayable.cgst + cashPayable.sgst + cashPayable.cess);

  // Closing ITC balance carried forward
  const closingItcBalance = {
    igst: round2(remIgstItc),
    cgst: round2(remCgstItc),
    sgst: round2(remSgstItc),
    cess: round2(remCessItc),
    total: round2(remIgstItc + remCgstItc + remSgstItc + remCessItc),
  };

  return {
    itcUtilized,
    cashPayable,
    closingItcBalance,
  };
};

/**
 * Main GSTR-3B Summary Calculation Engine
 * @param {Array} gstr1Entries - Sales / Outward GSTR-1 records
 * @param {Array} gstr2Entries - Inward / Purchase GSTR-2 records
 * @param {Object} options - Configuration and period metadata
 */
export const calculateGstr3bSummary = (gstr1Entries = [], gstr2Entries = [], options = {}) => {
  // ── Section 3.1 Rows ──────────────────────────────────────────────
  const sec31a = createEmptySectionRow("3.1(a)", "Outward taxable supplies (other than zero rated, nil rated and exempted)");
  const sec31b = createEmptySectionRow("3.1(b)", "Outward taxable supplies (zero rated)");
  const sec31c = createEmptySectionRow("3.1(c)", "Other outward supplies (nil rated, exempted)");
  const sec31d = createEmptySectionRow("3.1(d)", "Inward supplies (liable to reverse charge)");
  const sec31e = createEmptySectionRow("3.1(e)", "Non-GST outward supplies");

  let gstr1TotalTaxable = 0;
  let gstr1TotalCgst = 0;
  let gstr1TotalSgst = 0;
  let gstr1TotalIgst = 0;
  let gstr1TotalCess = 0;

  gstr1Entries.forEach((entry) => {
    const classification = classifyGstr1Entry(entry);
    const factor = classification === "3.1(a)_CREDIT_NOTE" ? -1 : 1;

    gstr1TotalTaxable += factor * Number(entry.taxableAmount || 0);
    gstr1TotalCgst += factor * Number(entry.cgst || 0);
    gstr1TotalSgst += factor * Number(entry.sgst || 0);
    gstr1TotalIgst += factor * Number(entry.igst || 0);
    gstr1TotalCess += factor * Number(entry.cess || 0);

    if (classification === "3.1(b)") {
      addRowValues(sec31b, entry, 1);
    } else if (classification === "3.1(c)") {
      addRowValues(sec31c, entry, 1);
    } else if (classification === "3.1(e)") {
      addRowValues(sec31e, entry, 1);
    } else {
      // Standard 3.1(a) (including credit note offset)
      addRowValues(sec31a, entry, factor);
    }
  });

  // ── Section 4 ITC Rows ───────────────────────────────────────────
  const itc4a1 = createEmptyItcRow("4(A)(1)", "Import of goods");
  const itc4a2 = createEmptyItcRow("4(A)(2)", "Import of services");
  const itc4a3 = createEmptyItcRow("4(A)(3)", "Inward supplies liable to reverse charge (other than 1 & 2 above)");
  const itc4a4 = createEmptyItcRow("4(A)(4)", "Inward supplies from ISD");
  const itc4a5 = createEmptyItcRow("4(A)(5)", "All other ITC");

  const itc4b1 = createEmptyItcRow("4(B)(1)", "As per rules 38, 42 & 43 of CGST Rules and section 17(5)");
  const itc4b2 = createEmptyItcRow("4(B)(2)", "Others");

  let gstr2TotalCgst = 0;
  let gstr2TotalSgst = 0;
  let gstr2TotalIgst = 0;
  let gstr2TotalCess = 0;

  gstr2Entries.forEach((entry) => {
    gstr2TotalCgst += Number(entry.cgst || 0);
    gstr2TotalSgst += Number(entry.sgst || 0);
    gstr2TotalIgst += Number(entry.igst || 0);
    gstr2TotalCess += Number(entry.cess || 0);

    const classification = classifyGstr2Entry(entry);

    if (classification === "4(A)(1)") {
      addItcRowValues(itc4a1, entry, 1);
    } else if (classification === "4(A)(2)") {
      addItcRowValues(itc4a2, entry, 1);
    } else if (classification === "4(A)(3)") {
      addItcRowValues(itc4a3, entry, 1);
      // RCM inward purchase also feeds 3.1(d) liability
      addRowValues(sec31d, entry, 1);
    } else if (classification === "4(A)(4)") {
      addItcRowValues(itc4a4, entry, 1);
    } else if (classification === "4(B)(1)") {
      addItcRowValues(itc4b1, entry, 1);
    } else if (classification === "4(B)(2)") {
      addItcRowValues(itc4b2, entry, 1);
    } else {
      addItcRowValues(itc4a5, entry, 1);
    }
  });

  // Section 3.1 Total
  const sec31Total = {
    code: "Total",
    description: "Total Outward & RCM Supplies",
    taxable: round2(sec31a.taxable + sec31b.taxable + sec31c.taxable + sec31d.taxable + sec31e.taxable),
    igst: round2(sec31a.igst + sec31b.igst + sec31d.igst),
    cgst: round2(sec31a.cgst + sec31b.cgst + sec31d.cgst),
    sgst: round2(sec31a.sgst + sec31b.sgst + sec31d.sgst),
    cess: round2(sec31a.cess + sec31b.cess + sec31d.cess),
    voucherCount: sec31a.voucherCount + sec31b.voucherCount + sec31c.voucherCount + sec31d.voucherCount + sec31e.voucherCount,
  };
  sec31Total.totalTax = round2(sec31Total.igst + sec31Total.cgst + sec31Total.sgst + sec31Total.cess);

  // Section 4 Subtotals
  const totalItcAvailable = {
    code: "4(A)",
    description: "(A) ITC Available (whether in full or part)",
    igst: round2(itc4a1.igst + itc4a2.igst + itc4a3.igst + itc4a4.igst + itc4a5.igst),
    cgst: round2(itc4a1.cgst + itc4a2.cgst + itc4a3.cgst + itc4a4.cgst + itc4a5.cgst),
    sgst: round2(itc4a1.sgst + itc4a2.sgst + itc4a3.sgst + itc4a4.sgst + itc4a5.sgst),
    cess: round2(itc4a1.cess + itc4a2.cess + itc4a3.cess + itc4a4.cess + itc4a5.cess),
  };
  totalItcAvailable.totalItc = round2(totalItcAvailable.igst + totalItcAvailable.cgst + totalItcAvailable.sgst + totalItcAvailable.cess);

  const totalItcReversed = {
    code: "4(B)",
    description: "(B) ITC Reversed",
    igst: round2(itc4b1.igst + itc4b2.igst),
    cgst: round2(itc4b1.cgst + itc4b2.cgst),
    sgst: round2(itc4b1.sgst + itc4b2.sgst),
    cess: round2(itc4b1.cess + itc4b2.cess),
  };
  totalItcReversed.totalItc = round2(totalItcReversed.igst + totalItcReversed.cgst + totalItcReversed.sgst + totalItcReversed.cess);

  const netItcAvailable = {
    code: "4(C)",
    description: "(C) Net ITC Available (A) - (B)",
    igst: round2(totalItcAvailable.igst - totalItcReversed.igst),
    cgst: round2(totalItcAvailable.cgst - totalItcReversed.cgst),
    sgst: round2(totalItcAvailable.sgst - totalItcReversed.sgst),
    cess: round2(totalItcAvailable.cess - totalItcReversed.cess),
  };
  netItcAvailable.totalItc = round2(netItcAvailable.igst + netItcAvailable.cgst + netItcAvailable.sgst + netItcAvailable.cess);

  // Section 4(D) Other Details
  const itc4d1 = createEmptyItcRow("4(D)(1)", "ITC reclaimed which was reversed under Table 4(B)(2) in earlier period");
  const itc4d2 = createEmptyItcRow("4(D)(2)", "Ineligible ITC under section 16(4) & ITC restricted due to PoS provisions");

  // ── Section 5/6: Tax Liability & Set-Off ──────────────────────────
  const outputTax = {
    igst: round2(sec31a.igst + sec31b.igst),
    cgst: round2(sec31a.cgst + sec31b.cgst),
    sgst: round2(sec31a.sgst + sec31b.sgst),
    cess: round2(sec31a.cess + sec31b.cess),
  };
  outputTax.total = round2(outputTax.igst + outputTax.cgst + outputTax.sgst + outputTax.cess);

  const rcmTax = {
    igst: round2(sec31d.igst),
    cgst: round2(sec31d.cgst),
    sgst: round2(sec31d.sgst),
    cess: round2(sec31d.cess),
  };
  rcmTax.total = round2(rcmTax.igst + rcmTax.cgst + rcmTax.sgst + rcmTax.cess);

  const totalLiability = {
    igst: round2(outputTax.igst + rcmTax.igst),
    cgst: round2(outputTax.cgst + rcmTax.cgst),
    sgst: round2(outputTax.sgst + rcmTax.sgst),
    cess: round2(outputTax.cess + rcmTax.cess),
  };
  totalLiability.total = round2(totalLiability.igst + totalLiability.cgst + totalLiability.sgst + totalLiability.cess);

  const setOffResult = calculateGstSetOff(outputTax, rcmTax, netItcAvailable);

  // ── Top Summary Cards Metrics ─────────────────────────────────────
  const summaryCards = {
    totalTaxableOutward: {
      title: "Total Taxable Outward Supplies",
      value: round2(sec31a.taxable + sec31b.taxable + sec31c.taxable + sec31e.taxable),
      igst: round2(sec31a.igst + sec31b.igst),
      cgst: round2(sec31a.cgst + sec31b.cgst),
      sgst: round2(sec31a.sgst + sec31b.sgst),
      cess: round2(sec31a.cess + sec31b.cess),
      totalTax: outputTax.total,
    },
    outputGst: {
      title: "Output GST Liability",
      value: outputTax.total,
      igst: outputTax.igst,
      cgst: outputTax.cgst,
      sgst: outputTax.sgst,
      cess: outputTax.cess,
    },
    eligibleItc: {
      title: "Eligible ITC",
      value: totalItcAvailable.totalItc,
      igst: totalItcAvailable.igst,
      cgst: totalItcAvailable.cgst,
      sgst: totalItcAvailable.sgst,
      cess: totalItcAvailable.cess,
    },
    itcReversal: {
      title: "ITC Reversal",
      value: totalItcReversed.totalItc,
      igst: totalItcReversed.igst,
      cgst: totalItcReversed.cgst,
      sgst: totalItcReversed.sgst,
      cess: totalItcReversed.cess,
    },
    netItc: {
      title: "Net ITC Available",
      value: netItcAvailable.totalItc,
      igst: netItcAvailable.igst,
      cgst: netItcAvailable.cgst,
      sgst: netItcAvailable.sgst,
      cess: netItcAvailable.cess,
    },
    netGstLiability: {
      title: "Net GST Payable in Cash",
      value: setOffResult.cashPayable.total,
      igst: setOffResult.cashPayable.igst,
      cgst: setOffResult.cashPayable.cgst,
      sgst: setOffResult.cashPayable.sgst,
      cess: setOffResult.cashPayable.cess,
    },
  };

  // ── Reconciliation ────────────────────────────────────────────────
  const reconciliation = {
    outward: {
      gstr1TotalTax: round2(gstr1TotalCgst + gstr1TotalSgst + gstr1TotalIgst + gstr1TotalCess),
      gstr3bTotalTax: outputTax.total,
      difference: round2((gstr1TotalCgst + gstr1TotalSgst + gstr1TotalIgst + gstr1TotalCess) - outputTax.total),
      isMatched: Math.abs((gstr1TotalCgst + gstr1TotalSgst + gstr1TotalIgst + gstr1TotalCess) - outputTax.total) < 0.01,
    },
    itc: {
      gstr2TotalItc: round2(gstr2TotalCgst + gstr2TotalSgst + gstr2TotalIgst + gstr2TotalCess),
      gstr3bNetItc: netItcAvailable.totalItc,
      difference: round2((gstr2TotalCgst + gstr2TotalSgst + gstr2TotalIgst + gstr2TotalCess) - netItcAvailable.totalItc),
      isMatched: Math.abs((gstr2TotalCgst + gstr2TotalSgst + gstr2TotalIgst + gstr2TotalCess) - netItcAvailable.totalItc) < 0.01,
    },
  };

  return {
    section31: {
      rows: [sec31a, sec31b, sec31c, sec31d, sec31e],
      total: sec31Total,
    },
    section4: {
      available: {
        rows: [itc4a1, itc4a2, itc4a3, itc4a4, itc4a5],
        total: totalItcAvailable,
      },
      reversed: {
        rows: [itc4b1, itc4b2],
        total: totalItcReversed,
      },
      netItc: netItcAvailable,
      otherDetails: {
        rows: [itc4d1, itc4d2],
      },
    },
    taxLiability: {
      outputTax,
      rcmTax,
      totalLiability,
      itcUtilized: setOffResult.itcUtilized,
      cashPayable: setOffResult.cashPayable,
      closingItcBalance: setOffResult.closingItcBalance,
    },
    summaryCards,
    reconciliation,
    counts: {
      gstr1Vouchers: gstr1Entries.length,
      gstr2Vouchers: gstr2Entries.length,
    },
  };
};

export default {
  calculateGstr3bSummary,
  classifyGstr1Entry,
  classifyGstr2Entry,
  calculateGstSetOff,
};
