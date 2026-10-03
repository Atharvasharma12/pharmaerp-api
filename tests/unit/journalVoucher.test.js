import buildVoucherNumber from "../../src/modules/finance/journal-vouchers/helpers/buildVoucherNumber.js";
import normalizeJournalLines from "../../src/modules/finance/journal-vouchers/helpers/normalizeJournalLines.js";
import validateVoucherDate from "../../src/modules/finance/journal-vouchers/helpers/validateVoucherDate.js";
import {
  createVoucherSchema,
  updateVoucherSchema,
  voucherIdParamSchema,
  getVouchersQuerySchema,
} from "../../src/modules/finance/journal-vouchers/validations/journalVoucher.validation.js";

describe("Journal Voucher Helpers", () => {
  describe("buildVoucherNumber", () => {
    it("should format voucher numbers correctly with padded sequence", () => {
      expect(buildVoucherNumber("JV", 2026, 5)).toBe("JV-2026-000005");
      expect(buildVoucherNumber("PV", 2026, 1234)).toBe("PV-2026-001234");
    });
  });

  describe("normalizeJournalLines", () => {
    it("should round debit and credit amounts to two decimal places", () => {
      const inputLines = [
        { accountId: "507f1f77bcf86cd799439011", debit: 100.1234, credit: 0 },
        { accountId: "507f1f77bcf86cd799439012", debit: 0, credit: 100.1266 },
      ];
      const output = normalizeJournalLines(inputLines);
      expect(output[0].debit).toBe(100.12);
      expect(output[1].credit).toBe(100.13);
    });

    it("should default debit and credit to 0 if invalid or absent", () => {
      const inputLines = [
        { accountId: "507f1f77bcf86cd799439011", debit: "invalid" },
      ];
      const output = normalizeJournalLines(inputLines);
      expect(output[0].debit).toBe(0);
      expect(output[0].credit).toBe(0);
    });
  });

  describe("validateVoucherDate", () => {
    it("should accept valid past and present dates", () => {
      const validDate = new Date();
      expect(validateVoucherDate(validDate).getTime()).toBe(validDate.getTime());
    });

    it("should reject future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      expect(() => validateVoucherDate(futureDate)).toThrow("Voucher date cannot be in the future");
    });

    it("should reject completely invalid dates", () => {
      expect(() => validateVoucherDate("not-a-date")).toThrow("Invalid voucher date format");
    });
  });
});

describe("Journal Voucher Validation Schemas", () => {
  const validAccountId = "507f1f77bcf86cd799439011";
  const anotherAccountId = "507f1f77bcf86cd799439012";

  describe("createVoucherSchema", () => {
    it("should validate a correct create payload", () => {
      const payload = {
        voucherDate: new Date().toISOString(),
        voucherType: "JOURNAL",
        referenceNumber: "REF-123",
        narration: "A test journal entry",
        status: "DRAFT",
        lines: [
          { accountId: validAccountId, debit: 100, credit: 0 },
          { accountId: anotherAccountId, debit: 0, credit: 100 },
        ],
      };
      const { error } = createVoucherSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should fail validation if there are less than 2 lines", () => {
      const payload = {
        voucherDate: new Date().toISOString(),
        voucherType: "JOURNAL",
        lines: [
          { accountId: validAccountId, debit: 100, credit: 0 },
        ],
      };
      const { error } = createVoucherSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it("should fail if voucherType is invalid", () => {
      const payload = {
        voucherDate: new Date().toISOString(),
        voucherType: "INVALID_TYPE",
        lines: [
          { accountId: validAccountId, debit: 100, credit: 0 },
          { accountId: anotherAccountId, debit: 0, credit: 100 },
        ],
      };
      const { error } = createVoucherSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe("updateVoucherSchema", () => {
    it("should validate update payload with at least one field", () => {
      const payload = {
        narration: "Updated narration",
      };
      const { error } = updateVoucherSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should fail validation if payload is empty", () => {
      const payload = {};
      const { error } = updateVoucherSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe("voucherIdParamSchema", () => {
    it("should validate a correct 24-character hex objectId", () => {
      const { error } = voucherIdParamSchema.validate({ voucherId: validAccountId });
      expect(error).toBeUndefined();
    });

    it("should fail if voucherId is not a valid objectId", () => {
      const { error } = voucherIdParamSchema.validate({ voucherId: "shortId" });
      expect(error).toBeDefined();
    });
  });

  describe("getVouchersQuerySchema", () => {
    it("should validate valid query parameters", () => {
      const { error } = getVouchersQuerySchema.validate({
        voucherType: "JOURNAL",
        status: "POSTED",
        page: 2,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });

    it("should reject invalid statuses in queries", () => {
      const { error } = getVouchersQuerySchema.validate({
        status: "INVALID_STATUS",
      });
      expect(error).toBeDefined();
    });
  });
});
