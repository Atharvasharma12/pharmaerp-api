import {
  normalizeMobileNumber,
  extractCustomerName,
  normalizeMedicineName,
  extractMedicineName,
  detectColumnMapping,
  extractB2CLegacyRow,
} from "../../src/modules/sales/invoices/helpers/b2cLegacyExtractor.js";

describe("Task 2: B2C Legacy Extractor & Normalizer", () => {
  describe("normalizeMobileNumber", () => {
    it("should accept valid 10-digit Indian mobile numbers in various formats", () => {
      expect(normalizeMobileNumber("9876543210")).toBe("9876543210");
      expect(normalizeMobileNumber("98765 43210")).toBe("9876543210");
      expect(normalizeMobileNumber("98765-43210")).toBe("9876543210");
      expect(normalizeMobileNumber("+91 9876543210")).toBe("9876543210");
      expect(normalizeMobileNumber("+91-9876543210")).toBe("9876543210");
      expect(normalizeMobileNumber("91 9876543210")).toBe("9876543210");
      expect(normalizeMobileNumber("919876543210")).toBe("9876543210");
      expect(normalizeMobileNumber(9876543210)).toBe("9876543210");
      expect(normalizeMobileNumber("6123456789")).toBe("6123456789");
      expect(normalizeMobileNumber("7999999999")).toBe("7999999999");
      expect(normalizeMobileNumber("8888888888")).toBe("8888888888");
    });

    it("should reject and return null for invalid mobile numbers", () => {
      expect(normalizeMobileNumber(null)).toBeNull();
      expect(normalizeMobileNumber(undefined)).toBeNull();
      expect(normalizeMobileNumber("")).toBeNull();
      expect(normalizeMobileNumber("   ")).toBeNull();
      expect(normalizeMobileNumber("987654321")).toBeNull(); // 9 digits
      expect(normalizeMobileNumber("98765432101")).toBeNull(); // 11 digits
      expect(normalizeMobileNumber("1234567890")).toBeNull(); // doesn't start with 6-9
      expect(normalizeMobileNumber("02224151234")).toBeNull(); // landline
      expect(normalizeMobileNumber("27AAPFU0939F1ZV")).toBeNull(); // GSTIN
      expect(normalizeMobileNumber("INV-2026-001")).toBeNull(); // Invoice no
      expect(normalizeMobileNumber("0000000000")).toBeNull();
    });
  });

  describe("extractCustomerName", () => {
    it("should extract customer name based on strict preference hierarchy", () => {
      const row1 = {
        "Patient Name": "Amit Kumar",
        "Name": "Other Name",
        "Customer Name": "Rahul Sharma",
      };
      // Customer Name has highest preference
      expect(extractCustomerName(row1)).toBe("Rahul Sharma");

      const row2 = {
        "Name": "Other Name",
        "Patient Name": "Pooja Patel",
      };
      // Patient Name preferred over Name
      expect(extractCustomerName(row2)).toBe("Pooja Patel");

      const row3 = {
        "Sold To": "Vikram Singh",
        "Name": "Other Name",
      };
      expect(extractCustomerName(row3)).toBe("Vikram Singh");
    });

    it("should NOT pick excluded headers like pharmacy/doctor/supplier/employee", () => {
      const row = {
        "Pharmacy Name": "Apollo Pharmacy",
        "Supplier Name": "Cipla Ltd",
        "Doctor Name": "Dr. Sharma",
        "Employee Name": "John Staff",
        "GST Registered Name": "Apollo Healthcare Private Limited",
      };
      expect(extractCustomerName(row)).toBeNull();
    });

    it("should return null if customer name cannot be determined", () => {
      expect(extractCustomerName({})).toBeNull();
      expect(extractCustomerName({ "Random Header": "123" })).toBeNull();
      expect(extractCustomerName({ "Customer Name": "" })).toBeNull();
    });
  });

  describe("normalizeMedicineName & extractMedicineName", () => {
    it("should normalize medicine names consistently", () => {
      expect(normalizeMedicineName("Dolo 650")).toBe("dolo 650");
      expect(normalizeMedicineName("DOLO 650")).toBe("dolo 650");
      expect(normalizeMedicineName("Dolo  650")).toBe("dolo 650");
      expect(normalizeMedicineName("  Azithromycin 500mg  ")).toBe("azithromycin 500mg");
      expect(normalizeMedicineName("Pantoprazole-40mg")).toBe("pantoprazole 40mg");
    });

    it("should extract medicine name from recognized columns", () => {
      expect(extractMedicineName({ "Medicine": "Dolo 650" })).toBe("Dolo 650");
      expect(extractMedicineName({ "Product Name": "Azithral 500" })).toBe("Azithral 500");
      expect(extractMedicineName({ "Item": "Crocin" })).toBe("Crocin");
      expect(extractMedicineName({ "Particulars": "Pan 40" })).toBe("Pan 40");
      expect(extractMedicineName({ "Drug Name": "Augmentin 625" })).toBe("Augmentin 625");
    });
  });

  describe("detectColumnMapping", () => {
    it("should accurately detect customer, mobile and medicine columns from header list", () => {
      const headers = ["Invoice No", "Customer Name", "Contact Mobile", "Item Name", "Amount"];
      const mapping = detectColumnMapping(headers);

      expect(mapping.customerNameField).toBe("Customer Name");
      expect(mapping.mobileNumberField).toBe("Contact Mobile");
      expect(mapping.medicineField).toBe("Item Name");
    });
  });

  describe("extractB2CLegacyRow", () => {
    it("should extract valid record with normalized values", () => {
      const row = {
        "Customer Name": "Rahul Sharma",
        "Mobile": "9876543210",
        "Medicine": "Dolo 650",
      };

      const result = extractB2CLegacyRow(row, 101);

      expect(result.isValid).toBe(true);
      expect(result.customerName).toBe("Rahul Sharma");
      expect(result.mobileNumber).toBe("9876543210");
      expect(result.medicineName).toBe("Dolo 650");
      expect(result.normalizedMedicineName).toBe("dolo 650");
      expect(result.rowNumber).toBe(101);
    });

    it("should mark invalid mobile number as invalid and provide skip reason", () => {
      const row = {
        "Customer Name": "Amit Sharma",
        "Mobile": "987654321", // 9 digits
        "Medicine": "Dolo 650",
      };

      const result = extractB2CLegacyRow(row, 105);

      expect(result.isValid).toBe(false);
      expect(result.skipReason).toBe("INVALID_MOBILE");
      expect(result.value).toBe("987654321");
    });

    it("should mark missing mobile number as invalid", () => {
      const row = {
        "Customer Name": "Suresh",
        "Mobile": "",
        "Medicine": "Dolo 650",
      };

      const result = extractB2CLegacyRow(row, 106);

      expect(result.isValid).toBe(false);
      expect(result.skipReason).toBe("MISSING_MOBILE");
    });

    it("should mark missing medicine name as invalid", () => {
      const row = {
        "Customer Name": "Ramesh",
        "Mobile": "9876543210",
        "Medicine": "",
      };

      const result = extractB2CLegacyRow(row, 107);

      expect(result.isValid).toBe(false);
      expect(result.skipReason).toBe("MISSING_MEDICINE");
    });
  });
});
