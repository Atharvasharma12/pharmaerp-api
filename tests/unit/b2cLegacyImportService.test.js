import mongoose from "mongoose";
import { jest } from "@jest/globals";
import B2CLegacyImportJob from "../../src/modules/sales/invoices/models/b2cLegacyImportJob.model.js";
import B2CLegacyImportStaging from "../../src/modules/sales/invoices/models/b2cLegacyImportStaging.model.js";
import SalesInvoice from "../../src/modules/sales/invoices/models/invoice.model.js";
import WorkspaceProduct from "../../src/modules/catalog/products/models/workspaceProduct.model.js";
import Customer from "../../src/modules/parties/customers/models/customer.model.js";
import {
  processChunk,
  materializeHistoricalInvoices,
} from "../../src/modules/sales/invoices/services/b2cLegacyImport.service.js";

describe("Task 3: B2C Legacy Import Service Engine", () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const migrationId = "MIG_TEST_001";

  let doloProduct;
  let azithralProduct;
  let pantoProduct;

  beforeAll(async () => {
    // In-memory or connected mock setup
    // Ensure WorkspaceProducts exist
    doloProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: "Dolo 650",
      normalizedName: "dolo 650",
      workspaceId,
    };
    azithralProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: "Azithromycin 500mg",
      normalizedName: "azithromycin 500mg",
      workspaceId,
    };
    pantoProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: "Pantoprazole 40mg",
      normalizedName: "pantoprazole 40mg",
      workspaceId,
    };
  });

  describe("processChunk", () => {
    it("should process chunk rows, match products, skip invalid rows, and stage customer medicines", async () => {
      // Mock Product finding
      const productFindSpy = jest
        .spyOn(WorkspaceProduct, "find")
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([doloProduct, azithralProduct, pantoProduct]),
          }),
        });

      const stagingBulkSpy = jest
        .spyOn(B2CLegacyImportStaging, "bulkWrite")
        .mockResolvedValue({ ok: 1 });

      const chunkRows = [
        { "Customer Name": "Rahul Sharma", "Mobile": "9876543210", "Medicine": "Dolo 650" },
        { "Customer Name": "Rahul Sharma", "Mobile": "9876543210", "Medicine": "Azithromycin 500mg" },
        { "Customer Name": "Amit Invalid", "Mobile": "987654321", "Medicine": "Dolo 650" }, // invalid mobile (9 digits)
        { "Customer Name": "Pooja", "Mobile": "8888888888", "Medicine": "Unknown Medicine 123" }, // unmatched product
      ];

      const job = {
        migrationId,
        workspaceId,
        companyId,
        branchId,
        processedRows: 0,
        validRows: 0,
        skippedRows: 0,
        matchedProducts: 0,
        unmatchedProducts: 0,
        skippedRecords: [],
        unmatchedMedicines: [],
      };

      const result = await processChunk({
        chunkRows,
        startRowNumber: 1,
        migrationId,
        workspaceId,
        companyId,
        branchId,
        columnMapping: {},
        job,
      });

      expect(result.processedCount).toBe(4);
      expect(result.validCount).toBe(3);
      expect(result.skippedCount).toBe(1); // Amit invalid mobile
      expect(result.matchedCount).toBe(2);
      expect(result.unmatchedCount).toBe(1); // Unknown medicine
      expect(job.skippedRecords.length).toBe(1);
      expect(job.skippedRecords[0].reason).toBe("INVALID_MOBILE");
      expect(job.unmatchedMedicines.length).toBe(1);
      expect(job.unmatchedMedicines[0].medicineName).toBe("Unknown Medicine 123");

      expect(stagingBulkSpy).toHaveBeenCalled();

      productFindSpy.mockRestore();
      stagingBulkSpy.mockRestore();
    });
  });

  describe("materializeHistoricalInvoices", () => {
    it("should create missing customers and insert historical sale invoices without inventory/accounting side effects", async () => {
      const mockStaged = [
        {
          _id: new mongoose.Types.ObjectId(),
          migrationId,
          workspaceId,
          companyId,
          branchId,
          mobileNumber: "9876543210",
          customerName: "Rahul Sharma",
          productIds: [doloProduct._id, azithralProduct._id],
          status: "pending",
        },
      ];

      const stagingFindSpy = jest
        .spyOn(B2CLegacyImportStaging, "find")
        .mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockStaged),
        });

      // Existing customer lookup returns empty (customer needs to be created)
      const customerFindSpy = jest
        .spyOn(Customer, "find")
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: new mongoose.Types.ObjectId(),
                mobile: "9876543210",
                name: "Rahul Sharma",
              },
            ]),
          }),
        });

      const customerBulkSpy = jest
        .spyOn(Customer, "bulkWrite")
        .mockResolvedValue({ ok: 1 });

      const productFindSpy = jest
        .spyOn(WorkspaceProduct, "find")
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([doloProduct, azithralProduct]),
          }),
        });

      const invoiceBulkSpy = jest
        .spyOn(SalesInvoice, "bulkWrite")
        .mockResolvedValue({ ok: 1 });

      const stagingUpdateSpy = jest
        .spyOn(B2CLegacyImportStaging, "updateMany")
        .mockResolvedValue({ modifiedCount: 1 });

      const job = {
        migrationId,
        customersCreated: 0,
        customersExisting: 0,
        invoicesCreated: 0,
      };

      const result = await materializeHistoricalInvoices({
        migrationId,
        workspaceId,
        companyId,
        branchId,
        job,
      });

      expect(customerBulkSpy).toHaveBeenCalled();
      expect(invoiceBulkSpy).toHaveBeenCalled();
      const invoiceOps = invoiceBulkSpy.mock.calls[0][0];
      expect(invoiceOps[0].insertOne.document.isHistoricalImport).toBe(true);
      expect(invoiceOps[0].insertOne.document.importSource).toBe("B2C_LEGACY_HISTORY");
      expect(invoiceOps[0].insertOne.document.items.length).toBe(2);
      expect(stagingUpdateSpy).toHaveBeenCalled();

      stagingFindSpy.mockRestore();
      customerFindSpy.mockRestore();
      customerBulkSpy.mockRestore();
      productFindSpy.mockRestore();
      invoiceBulkSpy.mockRestore();
      stagingUpdateSpy.mockRestore();
    });
  });
});
