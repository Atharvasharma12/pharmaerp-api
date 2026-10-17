import {
  isMargStatement,
  cleanMedicinePackSuffix,
  parseMargBillHeader,
  isMargItemRow,
  transformMargStatementRows,
} from "../../src/modules/sales/invoices/helpers/margStatementParser.js";

describe("Task 7: Marg ERP Statement Parser & Normalizer", () => {
  const sampleMargSnippet = [
    ["PAHUCH AROGYAM PHARMACY PVT. LTD."],
    ["SHOP No. 17, ATAL BIHARI MARKET A.B. ROAD DHAMNOD"],
    ["Phone : 9425459619 E-Mail : rajupatidar619@gmail.com"],
    ["SALES STATEMENT FROM 01-10-2026 TO 16-10-2026"],
    [],
    ["", "BILL NO.", "   DESCRIPTION", "", "", "CASH", "CREDIT"],
    ["", "", "D I S C R I P T I O N", "QTY.", "EXP BATCH", "", ""],
    ["SUREKHA    DR SUREKHA JAIN"],
    ["09-10-2026"],
    ["", "P3038972", "   7566881117 AJIT SHINGH YADAV", "", "", "", "408"],
    ["", "", "LABETAMAC TAB        10*", "3", "1/28 971A", "", ""],
    [],
    ["NO", "OF", "BILLS : 1   TOTAL AMOUNT :", "408", "", "0", "408"],
    [],
    ["DR ATUL    DR ATUL TAPADIYA"],
    ["10-10-2026"],
    ["", "P3039184", "   9174450782 JITENDRA JI", "", "", "175", ""],
    ["", "", "ECOSPRIN AV 75 CAP   10X15", "2", "11/27 28028528", "", ""],
    ["", "", "TRYPTOMER 10         1X1010T", "1", "3/28 D2600135", "", ""],
    [],
    ["", "P1006810", "   NOTA       NONE", "", "", "226", ""],
    ["", "", "MONTINA L DT         1*10", "1", "9/27 DPK251526", "", ""],
  ];

  describe("isMargStatement", () => {
    it("should detect Marg ERP statement format from header and structure", () => {
      expect(isMargStatement(sampleMargSnippet)).toBe(true);
    });

    it("should return false for regular flat tabular sheets", () => {
      const flatRows = [
        ["Customer Name", "Mobile Number", "Medicine Name"],
        ["Rahul", "9876543210", "Dolo 650"],
      ];
      expect(isMargStatement(flatRows)).toBe(false);
    });
  });

  describe("cleanMedicinePackSuffix", () => {
    it("should strip trailing pack descriptions separated by whitespace", () => {
      expect(cleanMedicinePackSuffix("LABETAMAC TAB        10*")).toEqual({
        cleanName: "LABETAMAC TAB",
        pack: "10*",
      });
      expect(cleanMedicinePackSuffix("ECOSPRIN AV 75 CAP   10X15")).toEqual({
        cleanName: "ECOSPRIN AV 75 CAP",
        pack: "10X15",
      });
      expect(cleanMedicinePackSuffix("CONCOR AM 5          1*10")).toEqual({
        cleanName: "CONCOR AM 5",
        pack: "1*10",
      });
      expect(cleanMedicinePackSuffix("BEPLEX FORTE TABLETS 1X20TAB.")).toEqual({
        cleanName: "BEPLEX FORTE TABLETS",
        pack: "1X20TAB.",
      });
      expect(cleanMedicinePackSuffix("GRILINCTUS DX SYRUP  100ML")).toEqual({
        cleanName: "GRILINCTUS DX SYRUP",
        pack: "100ML",
      });
      expect(cleanMedicinePackSuffix("TAZLOC 40 TAB        15S")).toEqual({
        cleanName: "TAZLOC 40 TAB",
        pack: "15S",
      });
    });
  });

  describe("parseMargBillHeader", () => {
    it("should parse valid bill header with mobile and customer name", () => {
      const row = ["", "P3038972", "   7566881117 AJIT SHINGH YADAV", "", "", "", "408"];
      const parsed = parseMargBillHeader(row);

      expect(parsed.isBillRow).toBe(true);
      expect(parsed.billNo).toBe("P3038972");
      expect(parsed.isValidMobile).toBe(true);
      expect(parsed.mobileNumber).toBe("7566881117");
      expect(parsed.customerName).toBe("AJIT SHINGH YADAV");
    });

    it("should parse bill header with mobile and unquoted comma in name", () => {
      const row = ["", "P1006824", "   9575516497 DURGA PRASHAD", "SHARMA", "", "", "187"];
      const parsed = parseMargBillHeader(row);

      expect(parsed.isBillRow).toBe(true);
      expect(parsed.isValidMobile).toBe(true);
      expect(parsed.mobileNumber).toBe("9575516497");
      expect(parsed.customerName).toContain("DURGA PRASHAD");
    });

    it("should reject bill header with NOTA NONE as missing valid mobile", () => {
      const row = ["", "P1006810", "   NOTA       NONE", "", "", "226", ""];
      const parsed = parseMargBillHeader(row);

      expect(parsed.isBillRow).toBe(true);
      expect(parsed.isValidMobile).toBe(false);
      expect(parsed.mobileNumber).toBeNull();
    });
  });

  describe("isMargItemRow", () => {
    it("should identify item rows with medicine description", () => {
      const itemRow = ["", "", "LABETAMAC TAB        10*", "3", "1/28 971A", "", ""];
      expect(isMargItemRow(itemRow)).toBe(true);
    });

    it("should reject summary/total/header rows", () => {
      expect(isMargItemRow(["NO", "OF", "BILLS : 1   TOTAL AMOUNT :", "408"])).toBe(false);
      expect(isMargItemRow(["", "BILL NO.", "   DESCRIPTION"])).toBe(false);
      expect(isMargItemRow(["09-10-2026"])).toBe(false);
    });
  });

  describe("transformMargStatementRows", () => {
    it("should transform Marg ERP statement rows into structured B2C records", () => {
      const records = transformMargStatementRows(sampleMargSnippet);

      // Only valid customers with valid mobile:
      // Bill 1: Ajit Singh Yadav (7566881117) -> LABETAMAC TAB
      // Bill 2: Jitendra Ji (9174450782) -> ECOSPRIN AV 75 CAP, TRYPTOMER 10
      // Bill 3: NOTA NONE -> Skipped!
      const validRecords = records.filter((r) => r.isValid);
      expect(validRecords.length).toBe(3);

      expect(validRecords[0].mobileNumber).toBe("7566881117");
      expect(validRecords[0].customerName).toBe("AJIT SHINGH YADAV");
      expect(validRecords[0].cleanMedicineName).toBe("LABETAMAC TAB");
      expect(validRecords[0].normalizedMedicineName).toBe("labetamac tab");

      expect(validRecords[1].mobileNumber).toBe("9174450782");
      expect(validRecords[1].cleanMedicineName).toBe("ECOSPRIN AV 75 CAP");

      expect(validRecords[2].mobileNumber).toBe("9174450782");
      expect(validRecords[2].cleanMedicineName).toBe("TRYPTOMER 10");

      const skippedRecords = records.filter((r) => !r.isValid);
      expect(skippedRecords.length).toBeGreaterThan(0);
    });
  });
});
