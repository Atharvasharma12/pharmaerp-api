import {
  createChequeSchema,
  clearChequeSchema,
  bounceChequeSchema,
  cancelChequeSchema,
  chequeIdParamSchema,
  getChequesQuerySchema,
} from "../../src/modules/finance/treasury/cheque-management/validations/cheque.validation.js";

describe("Cheque Validation Schemas", () => {
  const validBankAccountId = "507f1f77bcf86cd799439011";
  const validCounterpartyAccountId = "507f191e810c19729de860ea";

  describe("createChequeSchema", () => {
    it("should validate a creation payload with chequeType and explicit counterpartyAccountId", () => {
      const payload = {
        chequeType: "RECEIVED",
        chequeNumber: "000124",
        chequeDate: new Date().toISOString(),
        bankAccountId: validBankAccountId,
        counterpartyAccountId: validCounterpartyAccountId,
        partyName: "Apollo Healthcare Ltd",
        amount: 15000,
        narration: "Advance payment",
      };

      const { error, value } = createChequeSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.partyName).toBe("Apollo Healthcare Ltd");
    });

    it("should validate when counterpartyAccountId is omitted (auto-resolves in service)", () => {
      const payload = {
        chequeType: "RECEIVED",
        chequeNumber: "000125",
        chequeDate: new Date().toISOString(),
        bankAccountId: validBankAccountId,
        partyName: "Sun Pharma Distributors",
        amount: 25000,
      };

      const { error } = createChequeSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should accept 'type' as an alias for 'chequeType' when sent from frontend form", () => {
      const payload = {
        type: "ISSUED",
        chequeNumber: "000126",
        chequeDate: new Date().toISOString(),
        bankAccountId: validBankAccountId,
        partyName: "Cipla Logistics",
        amount: 8500,
        remarks: "Vendor invoice settlement",
      };

      const { error } = createChequeSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should fail validation if neither chequeType nor type is provided", () => {
      const payload = {
        chequeNumber: "000127",
        chequeDate: new Date().toISOString(),
        bankAccountId: validBankAccountId,
        partyName: "Dr. Reddy Labs",
        amount: 12000,
      };

      const { error } = createChequeSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.message).toMatch(/cheque type/i);
    });

    it("should fail validation if amount is zero or negative", () => {
      const payload = {
        chequeType: "RECEIVED",
        chequeNumber: "000128",
        chequeDate: new Date().toISOString(),
        bankAccountId: validBankAccountId,
        partyName: "Dr. Reddy Labs",
        amount: -100,
      };

      const { error } = createChequeSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.message).toMatch(/amount must be greater than zero/i);
    });
  });

  describe("getChequesQuerySchema", () => {
    it("should accept both chequeType and type filter query params", () => {
      const { error: err1 } = getChequesQuerySchema.validate({ chequeType: "RECEIVED" });
      expect(err1).toBeUndefined();

      const { error: err2 } = getChequesQuerySchema.validate({ type: "ISSUED" });
      expect(err2).toBeUndefined();
    });
  });

  describe("clearChequeSchema", () => {
    it("should validate clearance with full ISO date", () => {
      const { error } = clearChequeSchema.validate({
        clearDate: "2026-10-16T18:00:00.000Z",
        narration: "Cleared via bank reconciliation",
      });
      expect(error).toBeUndefined();
    });

    it("should validate clearance with simple YYYY-MM-DD date string", () => {
      const { error } = clearChequeSchema.validate({
        clearDate: "2026-10-16",
        narration: "Cleared today",
      });
      expect(error).toBeUndefined();
    });

    it("should validate clearance when clearDate is omitted or empty", () => {
      const { error: err1 } = clearChequeSchema.validate({});
      expect(err1).toBeUndefined();

      const { error: err2 } = clearChequeSchema.validate({ clearDate: "" });
      expect(err2).toBeUndefined();

      const { error: err3 } = clearChequeSchema.validate({ clearDate: null });
      expect(err3).toBeUndefined();
    });

    it("should validate clearance when clearDate is passed as a payload object from modal", () => {
      const { error } = clearChequeSchema.validate({
        clearDate: {
          clearDate: "2026-10-16",
          narration: "Bank confirmation",
        },
      });
      expect(error).toBeUndefined();
    });
  });
});

