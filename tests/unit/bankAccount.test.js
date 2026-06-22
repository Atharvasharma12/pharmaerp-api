import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankAccountIdParamSchema,
  getBankAccountsQuerySchema,
} from "../../src/modules/finance/treasury/bank-management/bank-accounts/validations/bankAccount.validation.js";

describe("Bank Account Validation Schemas", () => {
  const validBankMasterId = "507f1f77bcf86cd799439011";

  describe("createBankAccountSchema", () => {
    it("should validate a correct creation payload", () => {
      const payload = {
        bankMasterId: validBankMasterId,
        accountName: "HDFC Primary Current",
        accountHolderName: "Pharmacy Corp Ltd",
        accountNumber: "5010020030040",
        ifscCode: "HDFC0001234",
        branchName: "MG Road Branch",
        branchAddress: "123 MG Road, Bangalore",
        registeredMobile: "+919876543210",
        accountType: "CURRENT",
        isPrimary: true,
      };

      const { error } = createBankAccountSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should allow optional fields to be omitted", () => {
      const payload = {
        bankMasterId: validBankMasterId,
        accountName: "HDFC Primary Current",
        accountHolderName: "Pharmacy Corp Ltd",
        accountNumber: "5010020030040",
        ifscCode: "HDFC0001234",
        branchName: "MG Road Branch",
      };

      const { error } = createBankAccountSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should fail validation if required fields are missing", () => {
      const payload = {
        bankMasterId: validBankMasterId,
        accountName: "HDFC Primary Current",
      };

      const { error } = createBankAccountSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it("should fail validation if IFSC code format is invalid", () => {
      const payload = {
        bankMasterId: validBankMasterId,
        accountName: "HDFC Primary Current",
        accountHolderName: "Pharmacy Corp Ltd",
        accountNumber: "5010020030040",
        ifscCode: "invalid-ifsc",
        branchName: "MG Road Branch",
      };

      const { error } = createBankAccountSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.message).toContain("Invalid IFSC code format");
    });

    it("should fail validation if accountType is not in enum", () => {
      const payload = {
        bankMasterId: validBankMasterId,
        accountName: "HDFC Primary Current",
        accountHolderName: "Pharmacy Corp Ltd",
        accountNumber: "5010020030040",
        ifscCode: "HDFC0001234",
        branchName: "MG Road Branch",
        accountType: "INVALID_TYPE",
      };

      const { error } = createBankAccountSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe("updateBankAccountSchema", () => {
    it("should validate a correct partial update payload", () => {
      const payload = {
        accountName: "HDFC Primary Current Updated",
        isActive: false,
      };

      const { error } = updateBankAccountSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it("should fail validation if payload is empty", () => {
      const payload = {};
      const { error } = updateBankAccountSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe("bankAccountIdParamSchema", () => {
    it("should validate a correct 24-character hex objectId", () => {
      const { error } = bankAccountIdParamSchema.validate({ bankAccountId: validBankMasterId });
      expect(error).toBeUndefined();
    });

    it("should fail if bankAccountId is not a valid objectId", () => {
      const { error } = bankAccountIdParamSchema.validate({ bankAccountId: "shortId" });
      expect(error).toBeDefined();
    });
  });

  describe("getBankAccountsQuerySchema", () => {
    it("should validate valid query parameters", () => {
      const { error } = getBankAccountsQuerySchema.validate({
        isActive: true,
        isPrimary: false,
        page: 2,
        limit: 10,
        search: "hdfc",
      });
      expect(error).toBeUndefined();
    });

    it("should reject invalid numeric parameters", () => {
      const { error } = getBankAccountsQuerySchema.validate({
        page: -5,
      });
      expect(error).toBeDefined();
    });
  });
});
