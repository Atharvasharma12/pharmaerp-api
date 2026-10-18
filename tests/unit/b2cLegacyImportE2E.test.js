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

describe("Task 6: B2C Legacy Import End-to-End Verification", () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const migrationId = "B2C_E2E_20261017_001";

  const doloId = new mongoose.Types.ObjectId();
  const azithralId = new mongoose.Types.ObjectId();
  const pantoId = new mongoose.Types.ObjectId();

  const mockDbProducts = [
    { _id: doloId, name: "Dolo 650", normalizedName: "dolo 650", workspaceId },
    { _id: azithralId, name: "Azithromycin 500mg", normalizedName: "azithromycin 500mg", workspaceId },
    { _id: pantoId, name: "Pantoprazole 40mg", normalizedName: "pantoprazole 40mg", workspaceId },
  ];

  let simulatedStagingStore = [];
  let simulatedCustomerStore = [];
  let simulatedInvoiceStore = [];

  beforeEach(() => {
    simulatedStagingStore = [];
    simulatedCustomerStore = [];
    simulatedInvoiceStore = [];
  });

  it("should process multi-chunk data, group customer across chunks, skip invalid mobiles, and create 1 historical bill", async () => {
    // 1. Mock WorkspaceProduct.find
    jest.spyOn(WorkspaceProduct, "find").mockImplementation((query) => ({
      select: () => ({
        lean: async () => {
          if (query._id && query._id.$in) {
            return mockDbProducts.filter((p) =>
              query._id.$in.some((id) => id.toString() === p._id.toString())
            );
          }
          return mockDbProducts;
        },
      }),
    }));

    // 2. Mock Staging bulkWrite ($addToSet across chunks)
    jest.spyOn(B2CLegacyImportStaging, "bulkWrite").mockImplementation(async (ops) => {
      for (const op of ops) {
        if (op.updateOne) {
          const { filter, update } = op.updateOne;
          let existing = simulatedStagingStore.find(
            (s) =>
              s.migrationId === filter.migrationId &&
              s.mobileNumber === filter.mobileNumber
          );

          if (!existing) {
            existing = {
              _id: new mongoose.Types.ObjectId(),
              migrationId: filter.migrationId,
              workspaceId: filter.workspaceId,
              companyId: update.$setOnInsert.companyId,
              branchId: update.$setOnInsert.branchId,
              customerName: update.$setOnInsert.customerName,
              mobileNumber: filter.mobileNumber,
              productIds: [],
              status: "pending",
            };
            simulatedStagingStore.push(existing);
          }

          if (update.$addToSet?.productIds?.$each) {
            for (const pid of update.$addToSet.productIds.$each) {
              if (!existing.productIds.some((id) => id.toString() === pid.toString())) {
                existing.productIds.push(pid);
              }
            }
          }
        }
      }
      return { ok: 1 };
    });

    jest.spyOn(B2CLegacyImportStaging, "find").mockImplementation(() => ({
      lean: async () => simulatedStagingStore.filter((s) => s.status === "pending"),
    }));

    jest.spyOn(B2CLegacyImportStaging, "updateMany").mockImplementation(async (query, update) => {
      const ids = query._id.$in.map((id) => id.toString());
      simulatedStagingStore.forEach((s) => {
        if (ids.includes(s._id.toString())) {
          s.status = update.$set.status;
        }
      });
      return { modifiedCount: ids.length };
    });

    // 3. Mock Customer find & bulkWrite
    jest.spyOn(Customer, "find").mockImplementation((query) => ({
      select: () => ({
        lean: async () => {
          if (query.mobile?.$in) {
            return simulatedCustomerStore.filter((c) =>
              query.mobile.$in.includes(c.mobile)
            );
          }
          return simulatedCustomerStore;
        },
      }),
    }));

    jest.spyOn(Customer, "bulkWrite").mockImplementation(async (ops) => {
      for (const op of ops) {
        if (op.insertOne?.document) {
          const doc = op.insertOne.document;
          simulatedCustomerStore.push({
            _id: new mongoose.Types.ObjectId(),
            ...doc,
          });
        }
      }
      return { ok: 1 };
    });

    // 4. Mock SalesInvoice bulkWrite
    jest.spyOn(SalesInvoice, "bulkWrite").mockImplementation(async (ops) => {
      for (const op of ops) {
        if (op.insertOne?.document) {
          simulatedInvoiceStore.push(op.insertOne.document);
        }
      }
      return { ok: 1 };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // RUN SIMULATION
    // ─────────────────────────────────────────────────────────────────────────────

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
      customersCreated: 0,
      customersExisting: 0,
      invoicesCreated: 0,
      skippedRecords: [],
      unmatchedMedicines: [],
    };

    // CHUNK 1: Rahul buys Dolo 650; Amit has invalid mobile (9 digits) -> skip
    const chunk1 = [
      { "Customer Name": "Rahul Sharma", "Mobile": "9876543210", "Medicine": "Dolo 650" },
      { "Customer Name": "Amit Sharma", "Mobile": "987654321", "Medicine": "Dolo 650" }, // SKIP
    ];
    await processChunk({
      chunkRows: chunk1,
      startRowNumber: 1,
      migrationId,
      workspaceId,
      companyId,
      branchId,
      columnMapping: {},
      job,
    });

    // CHUNK 2: Rahul buys Azithromycin 500mg; Priya has invalid mobile (starts with 1) -> skip
    const chunk2 = [
      { "Customer Name": "Rahul", "Mobile": "+91 9876543210", "Medicine": "Azithromycin 500mg" },
      { "Customer Name": "Priya", "Mobile": "1234567890", "Medicine": "Dolo 650" }, // SKIP
    ];
    await processChunk({
      chunkRows: chunk2,
      startRowNumber: 3,
      migrationId,
      workspaceId,
      companyId,
      branchId,
      columnMapping: {},
      job,
    });

    // CHUNK 3: Rahul buys Pantoprazole 40mg + duplicate Dolo 650; Suresh has no mobile -> skip; Pooja buys unknown medicine
    const chunk3 = [
      { "Customer Name": "Rahul Sharma", "Mobile": "98765-43210", "Medicine": "Pantoprazole 40mg" },
      { "Customer Name": "Rahul Sharma", "Mobile": "9876543210", "Medicine": "Dolo 650" }, // Duplicate product for Rahul
      { "Customer Name": "Suresh", "Mobile": "", "Medicine": "Dolo 650" }, // SKIP
      { "Customer Name": "Pooja Verma", "Mobile": "7777777777", "Medicine": "Unregistered Syrup 100ml" }, // Unmatched product
    ];
    await processChunk({
      chunkRows: chunk3,
      startRowNumber: 5,
      migrationId,
      workspaceId,
      companyId,
      branchId,
      columnMapping: {},
      job,
    });

    // Verify Chunk Ingest Results
    expect(job.processedRows).toBe(8);
    expect(job.skippedRows).toBe(3); // Amit, Priya, Suresh
    expect(job.unmatchedProducts).toBe(1); // Unregistered Syrup 100ml
    expect(job.skippedRecords.length).toBe(3);
    expect(job.unmatchedMedicines.length).toBe(1);

    // Verify Staging: Rahul should have exactly 1 staging record with 3 unique products
    const rahulStaging = simulatedStagingStore.find((s) => s.mobileNumber === "9876543210");
    expect(rahulStaging).toBeDefined();
    expect(rahulStaging.productIds.length).toBe(3); // Dolo, Azithral, Panto

    // ─────────────────────────────────────────────────────────────────────────────
    // MATERIALIZATION PHASE
    // ─────────────────────────────────────────────────────────────────────────────
    await materializeHistoricalInvoices({
      migrationId,
      workspaceId,
      companyId,
      branchId,
      job,
    });

    // Verify Customer Creation
    expect(job.customersCreated).toBe(1); // Rahul created
    expect(simulatedCustomerStore.length).toBe(1);
    expect(simulatedCustomerStore[0].mobile).toBe("9876543210");
    expect(simulatedCustomerStore[0].name).toBe("Rahul Sharma");

    // Verify Historical Sales Invoice
    expect(job.invoicesCreated).toBe(1);
    expect(simulatedInvoiceStore.length).toBe(1);

    const rahulInvoice = simulatedInvoiceStore[0];
    expect(rahulInvoice.isHistoricalImport).toBe(true);
    expect(rahulInvoice.importSource).toBe("B2C_LEGACY_HISTORY");
    expect(rahulInvoice.migrationId).toBe(migrationId);
    expect(rahulInvoice.billingMode).toBe("B2C");
    expect(rahulInvoice.status).toBe("Paid");
    expect(rahulInvoice.subtotal).toBe(0);
    expect(rahulInvoice.grandTotal).toBe(0);

    // Verify items in Rahul's bill: Exactly 3 items with quantity 1
    expect(rahulInvoice.items.length).toBe(3);
    const itemNames = rahulInvoice.items.map((i) => i.name);
    expect(itemNames).toContain("Dolo 650");
    expect(itemNames).toContain("Azithromycin 500mg");
    expect(itemNames).toContain("Pantoprazole 40mg");

    // Verify Staging record status updated to migrated
    expect(rahulStaging.status).toBe("migrated");
  });
});
