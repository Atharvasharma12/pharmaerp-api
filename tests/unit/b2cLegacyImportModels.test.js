import mongoose from "mongoose";
import B2CLegacyImportJob from "../../src/modules/sales/invoices/models/b2cLegacyImportJob.model.js";
import B2CLegacyImportStaging from "../../src/modules/sales/invoices/models/b2cLegacyImportStaging.model.js";
import SalesInvoice from "../../src/modules/sales/invoices/models/invoice.model.js";
import WorkspaceProduct from "../../src/modules/catalog/products/models/workspaceProduct.model.js";
import Customer from "../../src/modules/parties/customers/models/customer.model.js";

describe("Task 1: B2C Legacy Import Models & Schema Enhancements", () => {
  describe("B2CLegacyImportJob Model", () => {
    it("should have the required schema fields and default values", () => {
      const schemaPaths = B2CLegacyImportJob.schema.paths;

      expect(schemaPaths.migrationId).toBeDefined();
      expect(schemaPaths.migrationId.isRequired).toBe(true);
      expect(schemaPaths.workspaceId).toBeDefined();
      expect(schemaPaths.companyId).toBeDefined();
      expect(schemaPaths.filePath).toBeDefined();
      expect(schemaPaths.status).toBeDefined();
      expect(schemaPaths.status.options.enum).toEqual([
        "pending",
        "processing",
        "paused",
        "completed",
        "failed",
      ]);
      expect(schemaPaths.totalRows).toBeDefined();
      expect(schemaPaths.processedRows).toBeDefined();
      expect(schemaPaths.validRows).toBeDefined();
      expect(schemaPaths.skippedRows).toBeDefined();
      expect(schemaPaths.lastProcessedRow).toBeDefined();
      expect(schemaPaths.chunkSize.defaultValue).toBe(1000);
      expect(schemaPaths.matchedProducts).toBeDefined();
      expect(schemaPaths.unmatchedProducts).toBeDefined();
      expect(schemaPaths.customersCreated).toBeDefined();
      expect(schemaPaths.customersExisting).toBeDefined();
      expect(schemaPaths.invoicesCreated).toBeDefined();
    });
  });

  describe("B2CLegacyImportStaging Model", () => {
    it("should have staging schema fields and unique compound index", () => {
      const schemaPaths = B2CLegacyImportStaging.schema.paths;

      expect(schemaPaths.migrationId).toBeDefined();
      expect(schemaPaths.workspaceId).toBeDefined();
      expect(schemaPaths.mobileNumber).toBeDefined();
      expect(schemaPaths.customerName).toBeDefined();
      expect(schemaPaths.productIds).toBeDefined();
      expect(schemaPaths.status).toBeDefined();
      expect(schemaPaths.status.options.enum).toEqual(["pending", "migrated"]);

      const indexes = B2CLegacyImportStaging.schema.indexes();
      const uniqueCompoundIndex = indexes.find(
        ([fields, options]) =>
          fields.migrationId === 1 &&
          fields.workspaceId === 1 &&
          fields.mobileNumber === 1 &&
          options?.unique === true
      );

      expect(uniqueCompoundIndex).toBeDefined();
    });
  });

  describe("SalesInvoice Schema Enhancements", () => {
    it("should include historical import tracking fields", () => {
      const schemaPaths = SalesInvoice.schema.paths;

      expect(schemaPaths.isHistoricalImport).toBeDefined();
      expect(schemaPaths.importSource).toBeDefined();
      expect(schemaPaths.migrationId).toBeDefined();
    });
  });

  describe("WorkspaceProduct Schema Enhancements", () => {
    it("should include normalizedName field and index", () => {
      const schemaPaths = WorkspaceProduct.schema.paths;

      expect(schemaPaths.normalizedName).toBeDefined();

      const indexes = WorkspaceProduct.schema.indexes();
      const normalizedIndex = indexes.find(
        ([fields]) => fields.workspaceId === 1 && fields.normalizedName === 1
      );

      expect(normalizedIndex).toBeDefined();
    });
  });

  describe("Customer Schema Index", () => {
    it("should have an index on workspaceId and mobile", () => {
      const indexes = Customer.schema.indexes();
      const mobileIndex = indexes.find(
        ([fields]) => fields.workspaceId === 1 && fields.mobile === 1
      );

      expect(mobileIndex).toBeDefined();
    });
  });
});
