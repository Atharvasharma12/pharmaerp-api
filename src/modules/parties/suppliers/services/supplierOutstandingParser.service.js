import XLSX from 'xlsx';

export const parseSupplierOutstandingExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  let reportDate = null;
  let currentSupplier = null;
  const transactions = [];

    const isReportHeader = (text) => {
      const cleanText = text.toUpperCase().replace(/\s+/g, '');
      if (cleanText.includes("PARTICULARS")) return true;
      if (cleanText.includes("OPENING")) return true;
      if (cleanText.includes("DETAILOFTRANSACTIONS")) return true;
      if (cleanText.includes("CLOSING")) return true;
      if (cleanText.includes("UPTO")) return true;
      if (cleanText.includes("PAGENO")) return true;
      if (cleanText.includes("CONTINUED")) return true;
      if (cleanText.includes("SUBTOTAL")) return true;
      if (cleanText.includes("GRANDTOTAL")) return true;
      if (cleanText.includes("M/S")) return true;
      if (cleanText.includes("FINANCIALYEAR")) return true;
      if (cleanText.includes("GSTIN")) return true;
      if (cleanText.includes("SUNDRYCREDITORS")) return true;
      return false;
    };

    const isSupplierHeader = (text) => {
      if (!/^-{1,}/.test(text)) return false;
      let clean = text.replace(/^-+/, "").trim();
      clean = clean.replace(/(?:\s+[\d,.]+\s*(?:Cr|Dr|Cr\.|Dr\.)?)+$/i, "").trim();
      if (!clean) return false;
      if (isReportHeader(clean)) return false;
      if (/^[\d,.\s]+$/.test(clean)) return false; // just numbers
      return clean;
    };

    const dateRegex = /\b(\d{1,2}[-\/\s.][A-Za-z0-9]{2,3}[-\/\s.]\d{2,4})\b/i;
    const fallbackDateRegex = /\b(\d{4}[-\/\s.]\d{1,2}[-\/\s.]\d{1,2})\b/i;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].map(c => String(c).trim());
      let fullRowText = row.join(" ").replace(/\s+/g, " ").trim();
      fullRowText = fullRowText.replace(/\u00A0/g, " ");

      if (!fullRowText) continue;

      // Report Date
      if (!reportDate) {
        const dateMatch = fullRowText.match(/OUTSTANDING AS ON (\d{2}-\d{2}-\d{4})/i) || fullRowText.match(/AS ON (\d{2}-\d{2}-\d{4})/i);
        if (dateMatch) {
          reportDate = dateMatch[1];
          continue;
        }
      }

      // Is it a Supplier Header?
      const supplierCandidate = isSupplierHeader(fullRowText);
      if (supplierCandidate) {
        currentSupplier = supplierCandidate;
        continue;
      }

      // Is it a Report Header?
      if (isReportHeader(fullRowText)) {
         continue; // Skip all report headers, including those with dates (e.g. 'UPTO 30-09-2026')
      }

      const dateCellMatch = row.find(cell => dateRegex.test(cell) || fallbackDateRegex.test(cell));

    if (dateCellMatch) {
      let compactRow = row.filter(c => c !== "");
      if (compactRow.length === 1) {
        compactRow = compactRow[0].replace(/\u00A0/g, " ").split(/\s+/).filter(c => c !== "");
      }

      let invoiceNumber = null;
      let date1 = null;
      let amountStr = null;
      let drCr = null;

      const dateIndex = compactRow.findIndex(c => dateRegex.test(c) || fallbackDateRegex.test(c));
      if (dateIndex >= 0) {
        if (dateIndex > 0) {
          invoiceNumber = compactRow.slice(0, dateIndex).join(" ").trim();
          if (invoiceNumber.toUpperCase().includes("UPTO") || invoiceNumber.toUpperCase() === "UPTO") {
            invoiceNumber = null; // Explicitly reject UPTO
          }
        }
        
        const dateMatch = compactRow[dateIndex].match(dateRegex) || compactRow[dateIndex].match(fallbackDateRegex);
        date1 = dateMatch ? dateMatch[0] : compactRow[dateIndex];
        
        for (let j = dateIndex + 1; j < compactRow.length; j++) {
           const val = compactRow[j];
           if (val.includes("Dr") || val.includes("Cr") || val.includes("Dr.") || val.includes("Cr.")) {
             const parts = val.split(" ");
             if (parts.length >= 2) {
               amountStr = parts[0];
               drCr = parts[1];
             } else {
                drCr = val;
                amountStr = compactRow[j-1]; 
             }
             break;
           } else if (!amountStr && /[\d,.]+/.test(val) && !val.includes("-")) {
             amountStr = val; 
           }
        }
        
        if (!drCr) {
           const amtCol = compactRow.find(c => c.includes("Cr") || c.includes("Dr"));
           if (amtCol) {
               if (amtCol.includes("Cr")) drCr = "Cr";
               if (amtCol.includes("Dr")) drCr = "Dr";
           } else {
             if (amountStr && amountStr.startsWith("(")) {
                drCr = "Dr";
             } else if (fullRowText.includes(" Dr") || fullRowText.includes("Dr.") || fullRowText.includes("(Dr)")) {
                drCr = "Dr";
             } else {
                drCr = "Cr";
             }
           }
        }
        
        let amount = 0;
        if (amountStr) {
           let cleanAmt = amountStr.replace(/[^0-9.]/g, '');
           amount = parseFloat(cleanAmt);
        }

        transactions.push({
          supplierName: currentSupplier || "SUPPLIER_CONTEXT_MISSING",
          invoiceNumber: invoiceNumber ? invoiceNumber.replace(/^\*+\s*/, "").trim().toUpperCase() : null,
          date: date1,
          amount: isNaN(amount) ? 0 : amount,
          type: drCr ? drCr.replace(/[^A-Za-z]/g, "").toUpperCase().substring(0, 2) : "CR", // CR or DR
          rowNumber: i + 1,
          rawRow: fullRowText
        });
      }
    }
  }

  return { reportDate, transactions };
};
