import XLSX from "xlsx";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import B2CLegacyImportJob from "../models/b2cLegacyImportJob.model.js";
import B2CLegacyImportStaging from "../models/b2cLegacyImportStaging.model.js";
import SalesInvoice from "../models/invoice.model.js";
import WorkspaceProduct from "../../../catalog/products/models/workspaceProduct.model.js";
import Customer from "../../../parties/customers/models/customer.model.js";
import {
  extractB2CLegacyRow,
  detectColumnMapping,
  normalizeMedicineName,
} from "../helpers/b2cLegacyExtractor.js";

// Active runners in memory to support pause/resume signals
const activeJobs = new Map();

const MAX_ERROR_SAMPLES_IN_DB = 1000;
const WRITE_BATCH_SIZE = 500;

/**
 * Creates and initializes a new B2C Legacy Import Job from an uploaded file.
 */
export const createImportJob = async ({
  file,
  workspaceId,
  companyId,
  branchId = null,
  userId = null,
  options = {},
}) => {
  if (!file || !file.path) {
    throw new Error("No file uploaded or file path missing");
  }

  const filePath = file.path;
  const originalFileName = file.originalname || path.basename(filePath);
  const fileSize = file.size || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);

  // Fast header inspection
  const workbook = XLSX.readFile(filePath, { sheetRows: 10, dense: true });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error("Uploaded Excel file has no worksheets");
  }

  const targetSheetName = options.sheetName || sheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  // Inspect headers from first row
  const sampleRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const headers = Array.isArray(sampleRows[0])
    ? sampleRows[0].map((h) => String(h || "").trim()).filter(Boolean)
    : [];

  const detectedMapping = detectColumnMapping(headers);

  // Estimate total rows from ref
  let totalRows = 0;
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    // Rows count minus 1 header row
    totalRows = Math.max(0, range.e.r);
  }

  const migrationId = `B2C_HIST_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase()}`;

  const job = await B2CLegacyImportJob.create({
    migrationId,
    workspaceId,
    companyId,
    branchId,
    filePath,
    originalFileName,
    fileSize,
    sheetName: targetSheetName,
    columnMapping: {
      customerNameField: options.customerNameField || detectedMapping.customerNameField,
      mobileNumberField: options.mobileNumberField || detectedMapping.mobileNumberField,
      medicineField: options.medicineField || detectedMapping.medicineField,
    },
    status: "pending",
    chunkSize: options.chunkSize ? Number(options.chunkSize) : 1000,
    totalRows,
    createdBy: userId,
  });

  return {
    migrationId,
    jobId: job._id,
    sheetNames,
    selectedSheet: targetSheetName,
    headers,
    detectedMapping,
    totalRows,
  };
};

/**
 * Processes a single chunk of rows:
 * 1. Validates mobile and extracts customer/medicine.
 * 2. Matches unique medicines against WorkspaceProduct in batch.
 * 3. Records skipped rows and unmatched medicines.
 * 4. Staging upsert into B2CLegacyImportStaging with $addToSet productIds.
 */
export const processChunk = async ({
  chunkRows,
  startRowNumber,
  migrationId,
  workspaceId,
  companyId,
  branchId,
  columnMapping,
  job,
}) => {
  let validCount = 0;
  let skippedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  const validExtracted = [];

  // Step 1: Extract and validate rows
  chunkRows.forEach((rawRow, idx) => {
    const rowNum = startRowNumber + idx;
    const extracted = extractB2CLegacyRow(rawRow, rowNum, columnMapping);

    if (!extracted.isValid) {
      skippedCount++;
      if (job.skippedRecords.length < MAX_ERROR_SAMPLES_IN_DB) {
        job.skippedRecords.push({
          rowNumber: rowNum,
          reason: extracted.skipReason,
          value: extracted.value || "",
        });
      }
    } else {
      validExtracted.push(extracted);
    }
  });

  validCount = validExtracted.length;

  if (validExtracted.length === 0) {
    job.processedRows += chunkRows.length;
    job.validRows += validCount;
    job.skippedRows += skippedCount;
    return {
      processedCount: chunkRows.length,
      validCount,
      skippedCount,
      matchedCount: 0,
      unmatchedCount: 0,
    };
  }

  // Step 2: Product matching in batch
  const uniqueNormalizedMedicines = [
    ...new Set(validExtracted.map((r) => r.normalizedMedicineName)),
  ];
  const uniqueRawMedicines = [
    ...new Set(validExtracted.map((r) => r.medicineName)),
  ];

  const productMap = new Map();

  const BATCH_QUERY_SIZE = 500;
  for (let i = 0; i < uniqueNormalizedMedicines.length; i += BATCH_QUERY_SIZE) {
    const batchNormalized = uniqueNormalizedMedicines.slice(i, i + BATCH_QUERY_SIZE);
    const batchRaw = uniqueRawMedicines.slice(i, i + BATCH_QUERY_SIZE);

    const products = await WorkspaceProduct.find({
      workspaceId,
      $or: [
        { normalizedName: { $in: batchNormalized } },
        { name: { $in: batchRaw } },
      ],
      isDeleted: false,
    })
      .select("_id name normalizedName")
      .lean();

    products.forEach((p) => {
      if (p.normalizedName) {
        productMap.set(p.normalizedName, { _id: p._id, name: p.name });
      }
      const normFromName = normalizeMedicineName(p.name);
      if (normFromName) {
        productMap.set(normFromName, { _id: p._id, name: p.name });
      }
    });
  }

  // Step 3: Group matched products by customer mobile for this chunk
  const customerMobileMap = new Map();

  validExtracted.forEach((r) => {
    const matchedProduct = productMap.get(r.normalizedMedicineName);

    if (!matchedProduct) {
      unmatchedCount++;
      if (job.unmatchedMedicines.length < MAX_ERROR_SAMPLES_IN_DB) {
        job.unmatchedMedicines.push({
          medicineName: r.medicineName,
          rowNumber: r.rowNumber,
        });
      }
    } else {
      matchedCount++;
      if (!customerMobileMap.has(r.mobileNumber)) {
        customerMobileMap.set(r.mobileNumber, {
          customerName: r.customerName,
          productIds: new Set(),
        });
      }
      customerMobileMap.get(r.mobileNumber).productIds.add(matchedProduct._id);
    }
  });

  // Step 4: Bulk upsert staging records with $addToSet
  if (customerMobileMap.size > 0) {
    const stagingOps = [];

    for (const [mobile, data] of customerMobileMap.entries()) {
      stagingOps.push({
        updateOne: {
          filter: {
            migrationId,
            workspaceId,
            mobileNumber: mobile,
          },
          update: {
            $setOnInsert: {
              companyId,
              branchId,
              customerName: data.customerName || "Customer",
              status: "pending",
            },
            $addToSet: {
              productIds: { $each: Array.from(data.productIds) },
            },
          },
          upsert: true,
        },
      });
    }

    if (stagingOps.length > 0) {
      await B2CLegacyImportStaging.bulkWrite(stagingOps, { ordered: false });
    }
  }

  job.processedRows += chunkRows.length;
  job.validRows += validCount;
  job.skippedRows += skippedCount;
  job.matchedProducts += matchedCount;
  job.unmatchedProducts += unmatchedCount;

  return {
    processedCount: chunkRows.length,
    validCount,
    skippedCount,
    matchedCount,
    unmatchedCount,
  };
};

/**
 * Phase 2: Materializes staged records into missing Customers and historical SalesInvoices.
 * Guarantees zero inventory decrements and zero financial ledger postings.
 */
export const materializeHistoricalInvoices = async ({
  migrationId,
  workspaceId,
  companyId,
  branchId,
  job,
}) => {
  const pendingStaged = await B2CLegacyImportStaging.find({
    migrationId,
    workspaceId,
    status: "pending",
  }).lean();

  if (!pendingStaged || pendingStaged.length === 0) {
    return { customersCreated: 0, customersExisting: 0, invoicesCreated: 0 };
  }

  let totalCustomersCreated = 0;
  let totalCustomersExisting = 0;
  let totalInvoicesCreated = 0;

  for (let i = 0; i < pendingStaged.length; i += WRITE_BATCH_SIZE) {
    const batch = pendingStaged.slice(i, i + WRITE_BATCH_SIZE);
    const mobiles = [...new Set(batch.map((b) => b.mobileNumber))];

    // Find existing customers in DB
    const existingCustomers = await Customer.find({
      workspaceId,
      mobile: { $in: mobiles },
      isDeleted: false,
    })
      .select("_id mobile name")
      .lean();

    const customerMap = new Map();
    existingCustomers.forEach((c) => customerMap.set(c.mobile, c));

    // Identify missing customers
    const missingMobiles = mobiles.filter((m) => !customerMap.has(m));
    totalCustomersExisting += mobiles.length - missingMobiles.length;

    if (missingMobiles.length > 0) {
      const customerOps = [];

      for (const m of missingMobiles) {
        const stagedRecord = batch.find((b) => b.mobileNumber === m);
        const name =
          stagedRecord?.customerName && stagedRecord.customerName.trim().length >= 2
            ? stagedRecord.customerName.trim()
            : "Customer";

        customerOps.push({
          insertOne: {
            document: {
              workspaceId,
              companyId,
              branchId,
              name,
              mobile: m,
              customerType: "RETAIL",
              status: "ACTIVE",
              isDeleted: false,
            },
          },
        });
      }

      if (customerOps.length > 0) {
        await Customer.bulkWrite(customerOps, { ordered: false });
        totalCustomersCreated += customerOps.length;

        // Fetch newly created customers to populate map
        const newlyCreated = await Customer.find({
          workspaceId,
          mobile: { $in: missingMobiles },
          isDeleted: false,
        })
          .select("_id mobile name")
          .lean();

        newlyCreated.forEach((c) => customerMap.set(c.mobile, c));
      }
    }

    // Collect all product IDs in this batch to fetch their names for items
    const allProductIds = [
      ...new Set(batch.flatMap((b) => b.productIds || [])),
    ];

    const products = await WorkspaceProduct.find({
      _id: { $in: allProductIds },
    })
      .select("_id name")
      .lean();

    const productNameMap = new Map();
    products.forEach((p) => productNameMap.set(p._id.toString(), p.name));

    // Prepare historical SalesInvoice bulkWrite
    const invoiceOps = [];
    const stagedIdsToUpdate = [];

    for (const staged of batch) {
      const customer = customerMap.get(staged.mobileNumber);
      if (!customer) continue;

      const items = (staged.productIds || []).map((pId) => {
        const pIdStr = pId.toString();
        const pName = productNameMap.get(pIdStr) || "Product";

        return {
          productId: pId,
          id: pId,
          name: pName,
          batch: "",
          qty: 1,
          rate: 0,
          price: 0,
          mrp: 0,
          disc: 0,
        };
      });

      invoiceOps.push({
        insertOne: {
          document: {
            workspaceId,
            companyId,
            branchId,
            customerId: customer._id,
            invoiceNo: `HIST-${staged.mobileNumber}-${migrationId.slice(-6)}`,
            billingMode: "B2C",
            status: "Paid",
            paymentMethod: "Historical Import",
            date: job.startedAt || new Date(),
            subtotal: 0,
            discount: 0,
            tax: 0,
            grandTotal: 0,
            items,
            isHistoricalImport: true,
            importSource: "B2C_LEGACY_HISTORY",
            migrationId,
          },
        },
      });

      stagedIdsToUpdate.push(staged._id);
    }

    if (invoiceOps.length > 0) {
      await SalesInvoice.bulkWrite(invoiceOps, { ordered: false });
      totalInvoicesCreated += invoiceOps.length;

      await B2CLegacyImportStaging.updateMany(
        { _id: { $in: stagedIdsToUpdate } },
        { $set: { status: "migrated" } }
      );
    }
  }

  job.customersCreated += totalCustomersCreated;
  job.customersExisting += totalCustomersExisting;
  job.invoicesCreated += totalInvoicesCreated;
  job.uniqueCustomersCount = job.customersCreated + job.customersExisting;

  return {
    customersCreated: totalCustomersCreated,
    customersExisting: totalCustomersExisting,
    invoicesCreated: totalInvoicesCreated,
  };
};

/**
 * Runner that executes chunked ingestion and subsequent materialization.
 */
export const runImportJob = async (migrationId) => {
  const job = await B2CLegacyImportJob.findOne({ migrationId });
  if (!job) throw new Error(`Migration job not found: ${migrationId}`);

  if (job.status === "completed") {
    return job;
  }

  job.status = "processing";
  if (!job.startedAt) job.startedAt = new Date();
  await job.save();

  activeJobs.set(migrationId, { shouldPause: false });

  try {
    const filePath = job.filePath;
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found on disk at: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath, { dense: true });
    const worksheet = workbook.Sheets[job.sheetName || workbook.SheetNames[0]];

    // Read rows as objects with headers
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    const totalFileRows = rawRows.length;
    job.totalRows = totalFileRows;

    const chunkSize = job.chunkSize || 1000;
    let currentRowIndex = job.lastProcessedRow || 0;

    // Process in chunks
    while (currentRowIndex < totalFileRows) {
      // Check for pause signal
      const activeState = activeJobs.get(migrationId);
      if (activeState?.shouldPause) {
        job.status = "paused";
        await job.save();
        activeJobs.delete(migrationId);
        return job;
      }

      const chunk = rawRows.slice(currentRowIndex, currentRowIndex + chunkSize);
      const startRowNumber = currentRowIndex + 2; // +1 for 1-based, +1 for header row

      await processChunk({
        chunkRows: chunk,
        startRowNumber,
        migrationId: job.migrationId,
        workspaceId: job.workspaceId,
        companyId: job.companyId,
        branchId: job.branchId,
        columnMapping: job.columnMapping,
        job,
      });

      currentRowIndex += chunk.length;
      job.lastProcessedRow = currentRowIndex;
      await job.save();
    }

    // Materialize Phase
    await materializeHistoricalInvoices({
      migrationId: job.migrationId,
      workspaceId: job.workspaceId,
      companyId: job.companyId,
      branchId: job.branchId,
      job,
    });

    job.status = "completed";
    job.completedAt = new Date();
    await job.save();
  } catch (err) {
    job.status = "failed";
    job.errorMessage = err.message;
    await job.save();
  } finally {
    activeJobs.delete(migrationId);
  }

  return job;
};

/**
 * Starts or triggers processing of a job asynchronously.
 */
export const startImportJob = async (migrationId, columnMappingOverrides = {}) => {
  const job = await B2CLegacyImportJob.findOne({ migrationId });
  if (!job) throw new Error("Job not found");

  if (columnMappingOverrides && Object.keys(columnMappingOverrides).length > 0) {
    if (columnMappingOverrides.customerNameField) {
      job.columnMapping.customerNameField = columnMappingOverrides.customerNameField;
    }
    if (columnMappingOverrides.mobileNumberField) {
      job.columnMapping.mobileNumberField = columnMappingOverrides.mobileNumberField;
    }
    if (columnMappingOverrides.medicineField) {
      job.columnMapping.medicineField = columnMappingOverrides.medicineField;
    }
    await job.save();
  }

  // Fire and run asynchronously without blocking the API response
  setImmediate(() => {
    runImportJob(migrationId).catch((err) => {
      console.error(`Error running legacy import job ${migrationId}:`, err);
    });
  });

  return job;
};

/**
 * Pauses an active job.
 */
export const pauseImportJob = async (migrationId) => {
  const job = await B2CLegacyImportJob.findOne({ migrationId });
  if (!job) throw new Error("Job not found");

  if (activeJobs.has(migrationId)) {
    activeJobs.get(migrationId).shouldPause = true;
  }

  job.status = "paused";
  await job.save();

  return job;
};

/**
 * Resumes a paused or stopped job.
 */
export const resumeImportJob = async (migrationId) => {
  const job = await B2CLegacyImportJob.findOne({ migrationId });
  if (!job) throw new Error("Job not found");

  if (job.status === "completed") {
    return job;
  }

  setImmediate(() => {
    runImportJob(migrationId).catch((err) => {
      console.error(`Error resuming legacy import job ${migrationId}:`, err);
    });
  });

  job.status = "processing";
  await job.save();

  return job;
};

/**
 * Fetches real-time status and metrics.
 */
export const getImportStatus = async (migrationId, workspaceId) => {
  const query = { migrationId };
  if (workspaceId) query.workspaceId = workspaceId;

  const job = await B2CLegacyImportJob.findOne(query).lean();
  if (!job) return null;

  const progressPercent =
    job.totalRows > 0
      ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100))
      : 0;

  const currentChunk = Math.ceil(job.processedRows / (job.chunkSize || 1000));
  const totalChunks = Math.ceil(job.totalRows / (job.chunkSize || 1000));

  return {
    migrationId: job.migrationId,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    validRows: job.validRows,
    skippedRows: job.skippedRows,
    uniqueCustomersCount: job.uniqueCustomersCount,
    customersCreated: job.customersCreated,
    customersExisting: job.customersExisting,
    matchedProducts: job.matchedProducts,
    unmatchedProducts: job.unmatchedProducts,
    invoicesCreated: job.invoicesCreated,
    currentChunk,
    totalChunks,
    progressPercent,
    lastProcessedRow: job.lastProcessedRow,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
  };
};

/**
 * Returns summary and detailed error/skipped lists.
 */
export const getImportReport = async (migrationId, workspaceId) => {
  const query = { migrationId };
  if (workspaceId) query.workspaceId = workspaceId;

  const job = await B2CLegacyImportJob.findOne(query).lean();
  if (!job) return null;

  return {
    migrationId: job.migrationId,
    status: job.status,
    summary: {
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      validRows: job.validRows,
      skippedRows: job.skippedRows,
      uniqueCustomersCount: job.uniqueCustomersCount,
      customersCreated: job.customersCreated,
      customersExisting: job.customersExisting,
      matchedProducts: job.matchedProducts,
      unmatchedProducts: job.unmatchedProducts,
      invoicesCreated: job.invoicesCreated,
    },
    skippedRecords: job.skippedRecords || [],
    unmatchedMedicines: job.unmatchedMedicines || [],
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
  };
};

const b2cLegacyImportService = {
  createImportJob,
  processChunk,
  materializeHistoricalInvoices,
  runImportJob,
  startImportJob,
  pauseImportJob,
  resumeImportJob,
  getImportStatus,
  getImportReport,
};

export default b2cLegacyImportService;
