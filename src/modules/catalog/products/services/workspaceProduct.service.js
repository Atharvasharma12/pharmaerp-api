/**
 * WorkspaceProduct Service
 *
 * Architecture rules (from gpnotes.md):
 * ─────────────────────────────────────
 * ✅ WorkspaceProduct is a custom product owned by a single Workspace.
 * ✅ Created only when no matching Global Product can be found in the catalog.
 * ✅ WorkspaceProduct stores: workspaceId, name, productType, manufacturer,
 *    pack, qty, productForm, HsnMaster (ref), notes, status, createdBy.
 *
 * ❌ WorkspaceProduct must NOT store:
 *    Medicine descriptions, drug interactions, safety advice,
 *    manufacturer address, country of origin, OTC information,
 *    regulatory data, MRP, PTR, PTS, stock, rack, inventory.
 *    (Descriptive/regulatory data belongs in GlobalProduct.
 *     Pricing belongs in Batch. Stock belongs in Inventory.)
 *
 * ❌ Never duplicate a Global Product as a Workspace Product.
 *    Global Product always takes priority.
 *
 * 🔗 HsnMaster is the single source of truth for GST/tax.
 *    Never inline GST rate or HSN description in WorkspaceProduct.
 *
 * 📦 productType is immutable after creation.
 *
 * 🔒 All queries are scoped to workspaceId — cross-workspace access is forbidden.
 *
 * 📋 Product reference pattern used by downstream modules (Inventory, Batch, etc.):
 *    { productSource: "WORKSPACE", productId: ObjectId }
 */

import ApiError from "../../../../utils/ApiError.js";

import workspaceProductRepository from "../repositories/workspaceProduct.repository.js";
import branchService from "../../../organization/branches/services/branch.service.js";
import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";


import productSearchModule from "../../product-search/productSearch.module.js";

import {
  WORKSPACE_PRODUCT_STATUS,
  WORKSPACE_PRODUCT_SOURCE,
} from "../constants/workspaceProduct.constant.js";

const getUserId = (user) => {
  return user?._id || user?.id || null;
};

// ---------------------
// Create
// ---------------------

/**
 * Search the global catalog before creating a workspace product.
 *
 * Call this from the frontend BEFORE calling createWorkspaceProduct.
 * It returns suggestions from the global catalog so the user can pick
 * a global product instead of creating a duplicate workspace one.
 *
 * Returns:
 *   { matched: true, confidence, productSource, productId, name, suggestions }
 *   OR
 *   { matched: false, suggestions: [...] }
 */
const searchBeforeCreate = async (name, workspaceId, productType = null) => {
  const result = await productSearchModule.search(name, workspaceId, {
    productType: productType || undefined,
  });

  return result;
};

/**
 * Create a new Workspace Product.
 *
 * Rules:
 * - Checks global catalog first — blocks creation if a confident global match
 *   is found (confidence ≥ 90%). Pass `force: true` to skip this check
 *   (e.g. user has already reviewed suggestions and explicitly wants a workspace product).
 * - Enforces name uniqueness within the same workspace.
 * - productType is set and remains immutable.
 */
const createWorkspaceProduct = async (workspaceId, payload, user) => {
  const userId = getUserId(user);

  // ─────────────────────────────────────────────────────────────────────
  // Step 1 — Global catalog duplicate guard
  //
  // Before creating a workspace product, search the global catalog.
  // If a confident match (≥ 90%) is found in the GLOBAL catalog, block
  // creation and inform the caller to use the global product instead.
  //
  // The caller (frontend) can pass `force: true` to bypass this check
  // after the user has reviewed the suggestions and explicitly decided
  // to create a workspace product anyway.
  // ─────────────────────────────────────────────────────────────────────
  if (!payload.force) {
    const searchResult = await productSearchModule.search(
      payload.name,
      workspaceId,
    );

    if (searchResult.matched) {
      if (searchResult.productSource === "GLOBAL") {
        throw new ApiError(
          409,
          `A matching Global Product already exists: "${searchResult.name}". ` +
          `Use the Global Product instead of creating a workspace product, ` +
          `or pass force=true to create anyway.`,
          {
            matched: true,
            confidence: searchResult.confidence,
            productSource: searchResult.productSource,
            productId: searchResult.productId,
            productName: searchResult.name,
            suggestions: searchResult.suggestions,
          },
        );
      } else if (searchResult.productSource === "WORKSPACE") {
        throw new ApiError(
          409,
          `A matching Workspace Product already exists: "${searchResult.name}". ` +
          `Use the existing Workspace Product instead, ` +
          `or pass force=true to create anyway.`,
          {
            matched: true,
            confidence: searchResult.confidence,
            productSource: searchResult.productSource,
            productId: searchResult.productId,
            productName: searchResult.name,
            suggestions: searchResult.suggestions,
          },
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 2 — Name uniqueness within this workspace
  // ─────────────────────────────────────────────────────────────────────
  const existing = await workspaceProductRepository.findWorkspaceProductByName(
    payload.name,
    workspaceId,
  );

  if (existing) {
    throw new ApiError(
      400,
      "A product with this name already exists in this workspace",
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Step 3 — Create workspace product
  // ─────────────────────────────────────────────────────────────────────
  const product = await workspaceProductRepository.createWorkspaceProduct({
    workspaceId,
    productType: payload.productType,
    name: payload.name,
    manufacturer: payload.manufacturer || null,
    pack: payload.pack,
    qty: payload.qty,
    uom: payload.uom || null,
    category: payload.category || null,
    productForm: payload.productForm || null,
    HsnMaster: payload.HsnMaster || null,
    composition: payload.composition || [],
    notes: payload.notes,
    source: WORKSPACE_PRODUCT_SOURCE.WORKSPACE,
    status: payload.status || WORKSPACE_PRODUCT_STATUS.ACTIVE,
    createdBy: userId,
    updatedBy: userId,
  });

  return product.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getWorkspaceProducts = async (workspaceId, filters = {}, options = {}) => {
  const { products, total, page, limit } =
    await workspaceProductRepository.getWorkspaceProducts(
      workspaceId,
      filters,
      options,
    );

  return {
    products: products.map((p) => p.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getWorkspaceProductById = async (productId, workspaceId) => {
  const product = await workspaceProductRepository.findWorkspaceProductById(
    productId,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return product.toSafeObject();
};

const getWorkspaceProductByCode = async (workspaceProductCode, workspaceId) => {
  const product = await workspaceProductRepository.findWorkspaceProductByCode(
    workspaceProductCode,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return product.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Workspace Product.
 *
 * Rules:
 * - productType is IMMUTABLE — cannot be changed after creation.
 * - HsnMaster can be updated to link correct GST (never inline GST data).
 * - Regulatory/descriptive fields must never be added here.
 * - Name uniqueness within workspace is re-enforced on rename.
 */
const updateWorkspaceProduct = async (productId, workspaceId, payload, user) => {
  const product = await workspaceProductRepository.findWorkspaceProductById(
    productId,
    workspaceId,
  );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  // Re-enforce name uniqueness if name is being changed
  if (payload.name && payload.name.trim() !== product.name) {
    if (!payload.force) {
      const searchResult = await productSearchModule.search(
        payload.name,
        workspaceId,
      );

      if (searchResult.matched && searchResult.productId.toString() !== product._id.toString()) {
        const sourceName = searchResult.productSource === "GLOBAL" ? "Global" : "Workspace";
        throw new ApiError(
          409,
          `A matching ${sourceName} Product already exists: "${searchResult.name}". ` +
          `Use the existing product instead, or pass force=true to update anyway.`,
          {
            matched: true,
            confidence: searchResult.confidence,
            productSource: searchResult.productSource,
            productId: searchResult.productId,
            productName: searchResult.name,
            suggestions: searchResult.suggestions,
          },
        );
      }
    }

    const existing =
      await workspaceProductRepository.findWorkspaceProductByName(
        payload.name,
        workspaceId,
      );

    if (existing && existing._id.toString() !== product._id.toString()) {
      throw new ApiError(
        400,
        "A product with this name already exists in this workspace",
      );
    }
  }

  const allowedFields = [
    "name",
    "manufacturer",
    "pack",
    "qty",
    "uom",
    "category",
    "productForm",
    "HsnMaster",
    "composition",
    "notes",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      product[field] = payload[field];
    }
  });

  product.updatedBy = getUserId(user);

  await workspaceProductRepository.saveWorkspaceProduct(product);

  return product.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

const deleteWorkspaceProduct = async (productId, workspaceId, user) => {
  const product =
    await workspaceProductRepository.softDeleteWorkspaceProductById(
      productId,
      workspaceId,
      getUserId(user),
    );

  if (!product) {
    throw new ApiError(404, "Workspace product not found");
  }

  return { success: true };
};

import Batch from "../models/batch.model.js";
import ProductFacility from "../models/productFacility.model.js";

import * as XLSX from "xlsx";

const HEADER_ALIASES_BACKEND = {
  name: ["name", "productname", "product", "itemname", "item", "title", "particulars", "description", "medicinename", "brandname"],
  productType: ["producttype", "type", "classification", "categorytype"],
  pack: ["pack", "package", "packaging", "packagingdetail", "packing", "unit"],
  mrp: ["mrp", "maximumretailprice"],
  ptr: ["ptr", "costprice", "purcprice", "purchaseprice", "cost"],
  rateA: ["ratea", "rate", "sellingprice", "price", "rate1", "salerate"],
  rateB: ["rateb"],
  rateC: ["ratec"],
  batchNo: ["batchno", "batch", "batchnumber", "lotno", "lotnumber", "lot"],
  expiryDate: ["expiry", "expirydate", "expdate", "exp"],
  batchQty: ["qty", "quantity", "batchqty", "stock", "stockqty", "balance", "currentstock", "openingstock"],
  rack: ["rack", "rackno", "location", "shelf", "bin"],
  marketer: ["marketer", "brand", "company", "manufacturer", "mfg"],
  itemCode: ["itemcode", "code"],
  batchScheme: ["batchscheme", "deal"],
  freeFromPurchase: ["freefrompurchase", "free"],
  notes: ["notes", "remark", "remarks", "invno"],
};

const cleanHeaderKey = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const parseSpreadsheetBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (!matrix || matrix.length === 0) return [];

  const ALL_ALIASES = Object.values(HEADER_ALIASES_BACKEND).flat();
  let bestIdx = 0;
  let maxMatches = 0;

  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const rowCells = matrix[r];
    if (!Array.isArray(rowCells)) continue;

    let matchCount = 0;
    rowCells.forEach((cell) => {
      const clean = cleanHeaderKey(cell);
      if (clean && ALL_ALIASES.some((alias) => clean === alias || clean.includes(alias))) {
        matchCount++;
      }
    });

    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestIdx = r;
    }
  }

  const header1 = matrix[bestIdx] || [];
  const header2 = matrix[bestIdx + 1] || [];
  let lastMainHeader = "";
  const maxCols = Math.max(header1.length, header2.length);
  const rawHeaders = [];

  for (let i = 0; i < maxCols; i++) {
    if (header1[i] && String(header1[i]).trim()) {
      lastMainHeader = String(header1[i]).trim();
    }
    const h1 = lastMainHeader;
    const h2 = String(header2[i] || "").trim();
    rawHeaders[i] = h2 ? `${h1} ${h2}` : h1;
  }

  const normalizedHeaders = rawHeaders.map((header) => {
    const clean = cleanHeaderKey(header);
    for (const [canonicalKey, aliases] of Object.entries(HEADER_ALIASES_BACKEND)) {
      if (aliases.includes(clean)) return canonicalKey;
    }
    return String(header || "").trim();
  });

  const isSecondRowSubHeader = header2.some((cell) => {
    const clean = cleanHeaderKey(cell);
    return clean === "deal" || clean === "free";
  });

  const startRow = isSecondRowSubHeader ? bestIdx + 2 : bestIdx + 1;
  const items = [];

  for (let r = startRow; r < matrix.length; r++) {
    const rowCells = matrix[r];
    if (!Array.isArray(rowCells) || rowCells.every((c) => String(c || "").trim() === "")) continue;

    const rowObj = {};
    normalizedHeaders.forEach((canonicalKey, cIdx) => {
      const val = rowCells[cIdx] !== undefined ? String(rowCells[cIdx]).trim() : "";
      if (canonicalKey) rowObj[canonicalKey] = val;
      if (rawHeaders[cIdx]) rowObj[rawHeaders[cIdx]] = val;
    });

    const getVal = (field) => {
      if (rowObj[field]) return rowObj[field];
      const aliases = HEADER_ALIASES_BACKEND[field] || [field];
      for (const k of Object.keys(rowObj)) {
        const cleanK = cleanHeaderKey(k);
        if (aliases.some((alias) => cleanK === alias || cleanK.includes(alias))) {
          if (rowObj[k]) return rowObj[k];
        }
      }
      return "";
    };

    const name = getVal("name");
    const batchNo = getVal("batchNo");

    const safeNumber = (val) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const mrp = safeNumber(getVal("mrp"));
    const ptr = safeNumber(getVal("ptr"));

    // Legacy IIFE rateB calculation:
    const rateB = (() => {
      const rawRateB = safeNumber(getVal("rateB"));
      if (rawRateB > 0) return rawRateB;

      if (mrp > 0) {
        const gstPercent = 5;
        const retailMarginPercent = 20;
        return Number(((mrp / (1 + gstPercent / 100)) * (1 - retailMarginPercent / 100)).toFixed(2));
      }
      return ptr;
    })();

    // Legacy IIFE rateA calculation:
    const rateA = (() => {
      let rB = rateB;
      if (rB <= 0 && mrp > 0) {
        rB = Number(((mrp / 1.05) * 0.80).toFixed(2));
      }

      if (rB > 0) {
        return Number((rB * 0.90).toFixed(2));
      }
      return ptr;
    })();

    // Legacy IIFE rateC calculation:
    const rateC = (() => {
      const rawRateC = safeNumber(getVal("rateC"));
      if (rawRateC > 0) return rawRateC;
      return Number((mrp * 0.84).toFixed(2));
    })();

    if (name || batchNo) {
      items.push({
        name,
        productType: getVal("productType") || "medicine",
        pack: getVal("pack"),
        mrp,
        ptr,
        rateA,
        rateB,
        rateC,
        batchNo,
        expiryDate: getVal("expiryDate"),
        batchQty: Math.abs(safeNumber(getVal("batchQty"))),
        rack: getVal("rack"),
        marketer: getVal("company") || getVal("marketer"),
        itemCode: getVal("itemCode"),
        batchScheme: safeNumber(getVal("batchScheme")),
        freeFromPurchase: safeNumber(getVal("freeFromPurchase")),
        notes: getVal("notes"),
      });
    }
  }

  return items;
};

// ---------------------
// Bulk Import Products & Stock
// ---------------------

const importWorkspaceProducts = async (workspaceId, itemsInput = [], user, options = {}) => {
  const userId = getUserId(user);
  const { branchId = null, file = null, autoCalcRateA = true, autoCalcRateB = true, autoCalcRateC = true, tempImportId = null, brandMappings = [] } = options;
  // Ensure we have a branch context – prefer explicit branchId, then user's branch, then activeContext.branchId, then fallback to workspace's first branch
  console.log('Import branch resolution: provided branchId =', branchId);
  console.log('User branchId =', user?.branchId);
  console.log('Active context branchId =', user?.activeContext?.branchId);
  let fallbackBranchId = null;
  // Determine if we need to fetch a fallback branch (no branch supplied anywhere)
  if (!branchId && !user?.branchId && !user?.activeContext?.branchId) {
    try {
      // Resolve fallback branch: fetch workspace to get companyId then list its branches
      const workspace = await workspaceRepository.findWorkspaceById(workspaceId);
      const companyId = workspace?.companyId;
      const branches = await branchService.getCompanyBranches(companyId, workspaceId, userId);
      if (branches && branches.length) fallbackBranchId = branches[0]._id;
    } catch (e) {
      console.warn('Unable to fetch default branches for import:', e.message);
    }
  }
  const effectiveBranchId = branchId || user?.branchId || fallbackBranchId;
  console.log('Effective branchId for import =', effectiveBranchId);
  // Added debug logging for import process

  let items = itemsInput;
  if (file && file.buffer) {
    items = parseSpreadsheetBuffer(file.buffer);
  }
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failedRows = [];
  const importedProducts = [];

  const toNumber = (val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  };

  const safeFixed = (val) => Number(Number(val || 0).toFixed(2));

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const rowNum = index + 1;

    try {
      if (!item.name || !String(item.name).trim()) {
        failedRows.push({ row: rowNum, error: "Product name is required" });
        skippedCount++;
        continue;
      }

      const productName = String(item.name).trim();
      const marketer = String(item.marketer || item.brand || item.company || "").trim();
      const productType = (item.productType || "medicine").toLowerCase();
      const itemCode = String(item.itemCode || item.code || "").trim();

      const mrp = toNumber(item.mrp);
      const importedPtr = toNumber(item.ptr);
      const importedRateA = toNumber(item.rateA);
      const importedRateB = toNumber(item.rateB);
      const importedRateC = toNumber(item.rateC);

      const batchScheme = toNumber(item.batchScheme || item.deal);
      const freeFromPurchase = toNumber(item.freeFromPurchase || item.free);
      const totalScheme = batchScheme + freeFromPurchase;
      const schemeDiscountPercent =
        totalScheme > 0 ? safeFixed((freeFromPurchase / totalScheme) * 100) : 0;

      // Rate pricing calculations matching legacy rules
      const gstPercent = 5;
      const retailerMarginPercent = 20;
      const stockistMarginPercent = 10;

      let ptr = importedPtr;
      if (autoCalcRateB && mrp > 0) {
        ptr = safeFixed((mrp / (1 + gstPercent / 100)) * (1 - retailerMarginPercent / 100));
      }

      const pts = safeFixed(ptr * (1 - stockistMarginPercent / 100));

      let rateB = importedRateB > 0 ? importedRateB : ptr;
      let rateA = autoCalcRateA ? (importedRateA > 0 ? importedRateA : safeFixed(rateB * 0.90)) : importedRateA;
      let rateC = autoCalcRateC ? (importedRateC > 0 ? importedRateC : (mrp > 0 ? safeFixed(mrp * 0.84) : 0)) : importedRateC;

      // Check if product already exists in workspace
      let product = await workspaceProductRepository.findWorkspaceProductByName(
        productName,
        workspaceId,
      );

      if (product) {
        updatedCount++;
      } else {
        // Create new WorkspaceProduct
        const productPayload = {
          workspaceId,
          name: productName,
          productType,
          pack: item.pack || "",
          mrp,
          ptr,
          pts,
          rateA,
          rateB,
          rateC,
          marketer,
          itemCode,
          rack: item.rack || "",
          notes: item.notes || "Imported via Inventory Import",
          createdBy: userId,
        };

        if (item.category) productPayload.category = item.category;
        if (item.uom) productPayload.uom = item.uom;
        if (item.manufacturer) productPayload.manufacturer = item.manufacturer;
        if (item.HsnMaster) productPayload.HsnMaster = item.HsnMaster;

        product = await workspaceProductRepository.createWorkspaceProduct(productPayload);
        createdCount++;
      }

      // If branchId or facility is provided, handle ProductFacility
      const targetBranchId = branchId || item.branchId || item.branch_id || item.facility_id || user?.activeContext?.branchId || fallbackBranchId || null;
      console.log(`Import row ${rowNum}: resolved targetBranchId = ${targetBranchId}`);
      if (targetBranchId) {
        let pf = await ProductFacility.findOne({
          workspaceId,
          facility_id: targetBranchId,
          product_id: product._id,
        });

        const initialQty = toNumber(item.qty || item.stockQty || item.batchQty || 0);

        if (!pf) {
          pf = new ProductFacility({
            workspaceId,
            facility_id: targetBranchId,
            product_id: product._id,
            total_qty_available: initialQty,
            qoh: initialQty,
            atp: initialQty,
            itemCode: itemCode || undefined,
          });
          console.log(`Created new ProductFacility for product ${product._id} at branch ${targetBranchId}`);
        } else if (initialQty > 0) {
          pf.total_qty_available += initialQty;
          pf.qoh += initialQty;
          pf.atp += initialQty;
          if (itemCode) pf.itemCode = itemCode;
          console.log(`Updated existing ProductFacility ${pf._id} with qty ${initialQty}`);
        }

        await pf.save();
        console.log(`ProductFacility saved with id ${pf._id}`);
      }

      // If batch details are provided, handle Batch creation
      if (item.batchNo && String(item.batchNo).trim()) {
        const batchNo = String(item.batchNo).trim();
        const expiryDate = item.expiryDate || "";
        const batchQty = toNumber(item.batchQty || item.qty || 0);

        let batch = await Batch.findOne({
          workspaceId,
          product: product._id,
          batchNo,
          expiryDate,
        });

        if (!batch) {
          batch = new Batch({
            workspaceId,
            branch_id: targetBranchId,
            product: product._id,
            batchNo,
            expiryDate,
            batchQty,
            mrp,
            ptr,
            pts,
            rate: rateB,
            rateA,
            rateB,
            rateC,
            freeQty: freeFromPurchase,
            schemeDiscountPercent,
          });
          console.log(`Created new Batch ${batchNo} for product ${product._id} at branch ${targetBranchId}`);
        } else if (batchQty > 0) {
          batch.batchQty += batchQty;
          console.log(`Updated Batch ${batch._id} with additional qty ${batchQty}`);
        }

        await batch.save();
        console.log(`Batch saved with id ${batch._id}`);
      }

      importedProducts.push(product.toSafeObject ? product.toSafeObject() : product);
    } catch (err) {
      failedRows.push({ row: rowNum, name: item.name, error: err.message });
      skippedCount++;
    }
  }

  return {
    totalProcessed: items.length,
    createdCount,
    updatedCount,
    skippedCount,
    failedRows,
    importedProductsCount: importedProducts.length,
  };
};

import mongoose from "mongoose";
import WorkspaceProduct from "../models/workspaceProduct.model.js";

const tempImportsStore = new Map();

const detectInventoryProducts = async (workspaceId, buffer) => {
  const products = parseSpreadsheetBuffer(buffer);

  // Get unique brand/marketer names from file
  const uniqueMarketers = [...new Set(products.map((p) => p.marketer).filter(Boolean))];

  // Get existing marketer names from Workspace Products in DB
  const dbProducts = await WorkspaceProduct.find(
    { workspaceId },
    { marketer: 1 }
  ).lean();

  const dbMarketers = [...new Set(dbProducts.map((p) => p.marketer).filter(Boolean))];

  const brandMappings = uniqueMarketers.map((m) => {
    const matched = dbMarketers.find(
      (db) => db?.toLowerCase() === m?.toLowerCase()
    );
    return {
      original: m,
      matched: matched || m,
    };
  });

  const tempImportId = crypto.randomUUID();
  tempImportsStore.set(tempImportId, { products, brandMappings, createdAt: Date.now() });

  return {
    tempImportId,
    brandMappings,
    productPreview: products.slice(0, 25),
    totalProducts: products.length,
  };
};

export default {
  searchBeforeCreate,
  createWorkspaceProduct,
  getWorkspaceProducts,
  getWorkspaceProductById,
  getWorkspaceProductByCode,
  updateWorkspaceProduct,
  deleteWorkspaceProduct,
  detectInventoryProducts,
  importWorkspaceProducts,
};
