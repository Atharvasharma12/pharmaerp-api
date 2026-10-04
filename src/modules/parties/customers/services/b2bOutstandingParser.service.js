import XLSX from 'xlsx';

export const parseB2BOutstandingExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  let reportDate = null;
  let reportYear = null;
  let currentCustomer = null;
  const invoices = [];
  let isInvoiceSection = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c).trim());
    const fullRowText = row.join(" ").replace(/\s+/g, " ").trim();

    if (!fullRowText) continue;

    // Detect Report Date
    if (!reportDate) {
      const dateMatch = fullRowText.match(/DEBTORS OUTSTANDING AS ON (\d{2}-\d{2}-\d{4})/i);
      if (dateMatch) {
        reportDate = dateMatch[1];
        reportYear = reportDate.split("-")[2];
        continue;
      }
    }

    // Ignore TOTAL rows
    if (fullRowText.toUpperCase().includes("TOTAL :") || fullRowText.toUpperCase().includes("TOTAL:")) {
      currentCustomer = null; 
      continue;
    }

    // Detect Header
    if (fullRowText.includes("INVOICE") && fullRowText.includes("DATE") && fullRowText.includes("BILL AMT")) {
      isInvoiceSection = true;
      continue;
    }

    if (!isInvoiceSection) continue;

    const dateRegex = /\b(\d{2}-\d{2}-\d{2})\b/;
    const dateCellMatch = row.find(cell => dateRegex.test(cell));

    if (dateCellMatch) {
      const compactRow = row.filter(c => c !== "");
      let invoiceNumber, invoiceDateStr, billAmountStr, balanceStr, dueStr;

      const dateIndex = compactRow.findIndex(c => dateRegex.test(c));
      if (dateIndex >= 1) {
        invoiceNumber = compactRow[dateIndex - 1];
        invoiceDateStr = compactRow[dateIndex];
        billAmountStr = compactRow[dateIndex + 1];
        balanceStr = compactRow[dateIndex + 2];
        dueStr = compactRow[dateIndex + 3];

        if (invoiceNumber && invoiceDateStr && billAmountStr && balanceStr) {
          if (invoiceNumber.startsWith("*")) {
            invoiceNumber = invoiceNumber.substring(1);
          }
          
          const [d, m, y] = invoiceDateStr.split("-");
          const fullY = y.length === 2 ? `20${y}` : y;
          const invoiceDate = `${fullY}-${m}-${d}`;

          const billAmount = parseFloat(billAmountStr.replace(/,/g, ''));
          const balance = parseFloat(balanceStr.replace(/,/g, ''));
          const dueDays = dueStr ? parseInt(dueStr, 10) : 0;

          if (currentCustomer) {
            invoices.push({
              customerName: currentCustomer,
              invoiceNumber,
              invoiceDate,
              billAmount,
              outstandingAmount: balance,
              dueDays: isNaN(dueDays) ? 0 : dueDays,
              rowNumber: i + 1
            });
          }
        }
      }
    } else {
      if (!fullRowText.includes("DEBTORS OUTSTANDING AS ON") && !fullRowText.includes("PAGE NO")) {
        currentCustomer = fullRowText;
      }
    }
  }

  return { reportDate, invoices };
};
