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

const formatExpiry = (val) => {
  if (!val) return "";
  let str = String(val).trim();
  if (/^\d{2}\/\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}/${yy}`;
  }
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const mm = parts[1].padStart(2, "0");
    const yy = parts[2].length === 4 ? parts[2].slice(-2) : parts[2];
    return `${mm}/${yy}`;
  } else if (parts.length === 2) {
    const mm = parts[0].padStart(2, "0");
    const yy = parts[1].length === 4 ? parts[1].slice(-2) : parts[1];
    return `${mm}/${yy}`;
  }
  return str;
};

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
    "mrp",
    "ptr",
    "pts",
    "rateA",
    "rateB",
    "rateC",
    "hsn",
    "hsnTaxpercent",
    "b2cDiscountPercent",
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
import HsnMaster from "../../../platform/global-catalog/hsn-master/models/hsnMaster.model.js";

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
  rateCPercentage: ["ratecpercentage", "ratecperc", "cperc", "cpercentage", "ratecpercent"],
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

    const rateCPercentage = (() => {
      const rawPerc = safeNumber(getVal("rateCPercentage"));
      if (rawPerc > 0) return rawPerc;
      return (mrp > 0 && rateC > 0) ? Number((((mrp - rateC) / mrp) * 100).toFixed(2)) : 16;
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
        rateCPercentage,
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
    }
  }
  const effectiveBranchId = branchId || user?.branchId || user?.activeContext?.branchId || fallbackBranchId;
  // Added debug logging for import process
  // Delete existing batches for the target branch before import
  console.log("effective branch id", effectiveBranchId)
  if (effectiveBranchId) {
    await Batch.deleteMany({ branch_id: effectiveBranchId });
  }

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

  // --- OPTIMIZATION: O(1) Pre-fetching & Bulk Writes ---
  const itemCodesToFetch = new Set();
  const namesToFetch = new Set();
  const batchNosToFetch = new Set();

  for (const item of items) {
    if (item.name && String(item.name).trim()) namesToFetch.add(String(item.name).trim());
    if (item.itemCode || item.code) itemCodesToFetch.add(String(item.itemCode || item.code).trim());
    if (item.batchNo && String(item.batchNo).trim()) batchNosToFetch.add(String(item.batchNo).trim());
  }

  const wpQuery = { workspaceId, $or: [] };
  if (itemCodesToFetch.size > 0) wpQuery.$or.push({ itemCode: { $in: Array.from(itemCodesToFetch) } });
  if (namesToFetch.size > 0) wpQuery.$or.push({ name: { $in: Array.from(namesToFetch) } });
  
  let existingProducts = [];
  if (wpQuery.$or.length > 0) {
    existingProducts = await WorkspaceProduct.find(wpQuery).lean().select('_id name itemCode');
  }

  const productByCode = new Map();
  const productByName = new Map();
  for (const p of existingProducts) {
    if (p.itemCode) productByCode.set(p.itemCode, p);
    if (p.name) productByName.set(p.name.toLowerCase(), p);
  }

  const existingProductIds = existingProducts.map(p => p._id);
  let existingFacilities = [];
  let existingBatches = [];
  
  if (effectiveBranchId && existingProductIds.length > 0) {
    existingFacilities = await ProductFacility.find({
      workspaceId,
      facility_id: effectiveBranchId,
      product_id: { $in: existingProductIds }
    }).lean().select('_id product_id total_qty_available qoh atp itemCode');

    if (batchNosToFetch.size > 0) {
      existingBatches = await Batch.find({
        workspaceId,
        branch_id: effectiveBranchId,
        product: { $in: existingProductIds },
        batchNo: { $in: Array.from(batchNosToFetch) }
      }).lean().select('_id product batchNo expiryDate batchQty');
    }
  }

  const facilityMap = new Map(); // key: product_id string
  for (const f of existingFacilities) {
    facilityMap.set(f.product_id.toString(), f);
  }

  const batchMap = new Map(); // key: product_id_batchNo_expiryDate
  for (const b of existingBatches) {
    const exp = b.expiryDate || "";
    batchMap.set(`${b.product.toString()}_${b.batchNo}_${exp}`, b);
  }

  const productOps = [];
  const facilityOps = [];
  const batchOps = [];

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
      const importedRateCPercentage = toNumber(item.rateCPercentage);

      const batchScheme = toNumber(item.batchScheme || item.deal);
      const freeFromPurchase = toNumber(item.freeFromPurchase || item.free);
      const totalScheme = batchScheme + freeFromPurchase;
      const schemeDiscountPercent = totalScheme > 0 ? safeFixed((freeFromPurchase / totalScheme) * 100) : 0;

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
      let rateCPercentage = importedRateCPercentage > 0 ? importedRateCPercentage : (mrp > 0 && rateC > 0 ? safeFixed(((mrp - rateC) / mrp) * 100) : 16);

      let product = null;
      if (itemCode && productByCode.has(itemCode)) {
        product = productByCode.get(itemCode);
      } else if (productByName.has(productName.toLowerCase())) {
        product = productByName.get(productName.toLowerCase());
      }

      let productId;
      if (product) {
        updatedCount++;
        productId = product._id;
        
        // Update existing product with latest rates
        const updateFields = { mrp, ptr, pts, rateA, rateB, rateC, rateCPercentage };
        if (item.rack) {
          updateFields.rack = item.rack;
        }

        productOps.push({
          updateOne: {
            filter: { _id: productId },
            update: { $set: updateFields }
          }
        });

        importedProducts.push(product);
      } else {
        productId = new mongoose.Types.ObjectId();
        
        // Generate a unique workspaceProductCode for bulkWrite since pre-save hooks don't run
        const wpCode = `WP${Math.floor(100000 + Math.random() * 900000)}${Date.now().toString().slice(-4)}${index}`;

        const productPayload = {
          _id: productId,
          workspaceProductCode: wpCode,
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
          rateCPercentage,
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

        productOps.push({
          insertOne: { document: productPayload }
        });

        // Add to map so subsequent rows can find it
        const newProduct = { _id: productId, name: productName, itemCode };
        if (itemCode) productByCode.set(itemCode, newProduct);
        productByName.set(productName.toLowerCase(), newProduct);
        
        importedProducts.push(newProduct);
        createdCount++;
      }

      const targetBranchId = branchId || item.branchId || item.branch_id || item.facility_id || user?.activeContext?.branchId || fallbackBranchId || null;
      if (targetBranchId) {
        const initialQty = toNumber(item.qty || item.stockQty || item.batchQty || 0);
        let pf = facilityMap.get(productId.toString());
        
        if (!pf) {
          const newPf = {
            workspaceId,
            facility_id: targetBranchId,
            product_id: productId,
            total_qty_available: initialQty,
            qoh: initialQty,
            atp: initialQty,
            itemCode: itemCode || undefined,
          };
          facilityOps.push({ insertOne: { document: newPf } });
          facilityMap.set(productId.toString(), newPf);
        } else if (initialQty > 0) {
          pf.total_qty_available += initialQty;
          pf.qoh += initialQty;
          pf.atp += initialQty;
          if (itemCode) pf.itemCode = itemCode;
          
          facilityOps.push({
            updateOne: {
              filter: { _id: pf._id },
              update: { $inc: { total_qty_available: initialQty, qoh: initialQty, atp: initialQty }, $set: { itemCode: pf.itemCode } }
            }
          });
        }
      }

      if (item.batchNo && String(item.batchNo).trim() && targetBranchId) {
        const batchNo = String(item.batchNo).trim();
        const expiryDate = formatExpiry(item.expiryDate);
        const batchQty = toNumber(item.batchQty || item.qty || 0);
        const batchKey = `${productId.toString()}_${batchNo}_${expiryDate}`;
        
        let batch = batchMap.get(batchKey);

        if (!batch) {
          const newBatch = {
            workspaceId,
            branch_id: targetBranchId,
            product: productId,
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
            rateCPercentage,
            freeQty: freeFromPurchase,
            schemeDiscountPercent,
          };
          batchOps.push({ insertOne: { document: newBatch } });
          batchMap.set(batchKey, newBatch);
        } else if (batchQty > 0) {
          batch.batchQty += batchQty;
          batchOps.push({
            updateOne: {
              filter: { _id: batch._id },
              update: { $inc: { batchQty: batchQty }, $set: { mrp, ptr, pts, rate: rateB, rateA, rateB, rateC, rateCPercentage } }
            }
          });
        }
      }
    } catch (err) {
      failedRows.push({ row: rowNum, name: item.name, error: err.message });
      skippedCount++;
    }
  }

  // --- Execute Chunked BulkWrites ---
  const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  if (productOps.length > 0) {
    for (const chunk of chunkArray(productOps, 1000)) {
      await WorkspaceProduct.bulkWrite(chunk, { ordered: false });
    }
  }
  if (facilityOps.length > 0) {
    for (const chunk of chunkArray(facilityOps, 1000)) {
      await ProductFacility.bulkWrite(chunk, { ordered: false });
    }
  }
  if (batchOps.length > 0) {
    for (const chunk of chunkArray(batchOps, 1000)) {
      await Batch.bulkWrite(chunk, { ordered: false });
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

/**
 * Bulk Import GST & HSN Mapping (Optimized for Large Files)
 */
const importWorkspaceProductsGst = async (
  workspaceId,
  itemsInput = [],
  user,
  options = {}
) => {
  const { file = null } = options;

  // ---------------------------------------------------------
  // 1. Read input
  // ---------------------------------------------------------

  let rawItems = [];

  if (file?.buffer) {
    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
      cellDates: false,
      cellNF: false,
      cellText: false,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    rawItems = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: true,
    });
  } else if (Array.isArray(itemsInput) && itemsInput.length) {
    rawItems = itemsInput;
  } else if (typeof itemsInput === "string" && itemsInput.trim()) {
    try {
      rawItems = JSON.parse(itemsInput);
    } catch (e) {
      rawItems = [];
    }
  }

  if (!rawItems.length) {
    throw new ApiError(
      400,
      "No items found in the import file or payload"
    );
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const normalizeKey = (key) =>
    String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const cleanItemCode = (value) =>
    String(value)
      .trim()
      .replace(/^[^a-zA-Z0-9]+/, "")
      .trim();

  const parseNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const num = Number(String(value).replace(/[^0-9.-]/g, ""));

    return Number.isFinite(num) ? num : null;
  };

  const VALID_GST_RATES = [0, 5, 12, 18, 28];

  const snapToValidGstRate = (rate) => {
    if (rate === null || rate === undefined || Number.isNaN(rate)) {
      return null;
    }

    let closest = VALID_GST_RATES[0];
    let minDiff = Math.abs(rate - closest);

    for (let i = 1; i < VALID_GST_RATES.length; i++) {
      const diff = Math.abs(rate - VALID_GST_RATES[i]);

      if (diff < minDiff) {
        minDiff = diff;
        closest = VALID_GST_RATES[i];
      }
    }

    return closest;
  };

  const FIELD_ALIASES = {
    itemCode: [
      "ItemCode",
      "itemCode",
      "Item Code",
      "item_code",
      "Code",
      "code",
      "SKU",
      "sku",
      "Item",
      "item",
      "Item No",
      "ItemNo",
      "item_no",
      "Product Code",
      "ProductCode",
      "product_code",
    ],

    hsn: [
      "HSNCode",
      "HSN Code",
      "HSN",
      "hsn",
      "hsnCode",
      "hsn_code",
      "hsn_sac",
      "HSN/SAC",
      "HSNSAC",
      "HSN No",
      "hsn_no",
    ],

    sgst: ["SGST", "sgst", "sgst%", "sgst_rate"],
    cgst: ["CGST", "cgst", "cgst%", "cgst_rate"],
    igst: ["IGST", "igst", "igst%", "igst_rate"],

    gst: [
      "GST",
      "IGST",
      "GST%",
      "GstPercentage",
      "GST Percentage",
      "LocalTax",
      "taxRate",
      "hsnTaxpercent",
      "Tax",
      "tax",
      "Tax%",
      "GST_Rate",
      "GSTRate",
      "Gst Rate",
      "Gst",
    ],
  };

  // Pre-normalize aliases once
  const NORMALIZED_ALIASES = Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([field, aliases]) => [
      field,
      aliases.map(normalizeKey),
    ])
  );

  /**
   * Get all relevant fields from one row.
   */
  const parseRow = (item) => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const normalizedRow = {};

    for (const [key, value] of Object.entries(item)) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        normalizedRow[normalizeKey(key)] = String(value).trim();
      }
    }

    const get = (field) => {
      const aliases = NORMALIZED_ALIASES[field];

      for (const alias of aliases) {
        if (
          normalizedRow[alias] !== undefined &&
          normalizedRow[alias] !== ""
        ) {
          return normalizedRow[alias];
        }
      }

      return null;
    };

    const itemCodeRaw = get("itemCode");

    if (!itemCodeRaw) {
      return {
        itemCodeRaw: null,
        cleanedItemCode: null,
        hsnNum: null,
        gstTaxPercent: null,
      };
    }

    const cleanedItemCode = cleanItemCode(itemCodeRaw);

    const hsnRaw = get("hsn");

    const hsnNum = hsnRaw
      ? parseNumber(hsnRaw)
      : null;

    const sgstVal = get("sgst");
    const cgstVal = get("cgst");
    const igstVal = get("igst");
    const gstVal = get("gst");

    let gstTaxPercent = null;

    const sgst = parseNumber(sgstVal);
    const cgst = parseNumber(cgstVal);
    const igst = parseNumber(igstVal);
    const gst = parseNumber(gstVal);

    if (sgst !== null && cgst !== null) {
      gstTaxPercent = sgst + cgst;
    } else if (igst !== null) {
      gstTaxPercent = igst;
    } else if (gst !== null) {
      gstTaxPercent = gst;
    }

    return {
      itemCodeRaw,
      cleanedItemCode,
      hsnNum,
      gstTaxPercent,
    };
  };

  // ---------------------------------------------------------
  // 2. Parse rows ONCE
  // ---------------------------------------------------------

  const parsedRows = [];

  const itemCodes = new Set();
  const hsnCodes = new Set();

  let skippedRowsCount = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const parsed = parseRow(rawItems[i]);

    if (!parsed?.itemCodeRaw) {
      skippedRowsCount++;
      continue;
    }

    const {
      itemCodeRaw,
      cleanedItemCode,
      hsnNum,
      gstTaxPercent,
    } = parsed;

    if (
      (hsnNum === null || Number.isNaN(hsnNum)) &&
      (gstTaxPercent === null || Number.isNaN(gstTaxPercent))
    ) {
      skippedRowsCount++;
      continue;
    }

    const strRaw = String(itemCodeRaw).trim();
    itemCodes.add(strRaw);
    if (cleanedItemCode) itemCodes.add(cleanedItemCode);
    const unpaddedRaw = strRaw.replace(/^0+/, "");
    if (unpaddedRaw) itemCodes.add(unpaddedRaw);
    if (cleanedItemCode) {
      const unpaddedClean = cleanedItemCode.replace(/^0+/, "");
      if (unpaddedClean) itemCodes.add(unpaddedClean);
    }

    if (hsnNum !== null && !Number.isNaN(hsnNum)) {
      hsnCodes.add(hsnNum);
    }

    parsedRows.push({
      rowNum: i + 2,
      itemCodeRaw,
      cleanedItemCode,
      hsnNum,
      gstTaxPercent,
    });
  }

  if (!parsedRows.length) {
    return {
      totalRows: rawItems.length,
      matchedRowsCount: 0,
      updatedProductsCount: 0,
      skippedRowsCount,
      errors: [],
    };
  }

  // ---------------------------------------------------------
  // 3. Fetch ProductFacility and WorkspaceProduct records
  // ---------------------------------------------------------

  const [pfDocs, wpDocs, hsnDocs] = await Promise.all([
    ProductFacility.find({
      workspaceId,
    })
      .select("product_id itemCode")
      .lean(),

    WorkspaceProduct.find({
      workspaceId,
      isDeleted: false,
    })
      .select("_id workspaceProductCode")
      .lean(),

    hsnCodes.size
      ? HsnMaster.find({
        code: { $in: [...hsnCodes] },
      })
        .select("_id code")
        .lean()
      : [],
  ]);

  // ---------------------------------------------------------
  // 4. Build ProductFacility & WorkspaceProduct maps
  // ---------------------------------------------------------

  const pfItemCodeMap = new Map();
  const wpCodeMap = new Map();

  const addToProductMap = (code, productId) => {
    if (!code || !productId) return;

    const rawKey = String(code).trim();
    if (!rawKey) return;

    const addKey = (key) => {
      if (!key) return;
      let ids = pfItemCodeMap.get(key);
      if (!ids) {
        ids = new Set();
        pfItemCodeMap.set(key, ids);
      }
      ids.add(String(productId));
    };

    addKey(rawKey);
    const cleanKey = cleanItemCode(rawKey);
    if (cleanKey) addKey(cleanKey);

    const unpaddedRaw = rawKey.replace(/^0+/, "");
    if (unpaddedRaw) addKey(unpaddedRaw);

    if (cleanKey) {
      const unpaddedClean = cleanKey.replace(/^0+/, "");
      if (unpaddedClean) addKey(unpaddedClean);
    }
  };

  for (const pf of pfDocs) {
    addToProductMap(pf.itemCode, pf.product_id);
  }

  for (const wp of wpDocs) {
    if (wp.workspaceProductCode) {
      wpCodeMap.set(String(wp.workspaceProductCode).trim(), String(wp._id));
    }
  }

  // ---------------------------------------------------------
  // 6. Build HSN map
  // ---------------------------------------------------------

  const hsnMap = new Map();

  for (const hsn of hsnDocs) {
    if (hsn.code !== undefined && hsn.code !== null) {
      hsnMap.set(Number(hsn.code), hsn._id);
    }
  }

  // ---------------------------------------------------------
  // 7. Find missing HSNs
  // ---------------------------------------------------------

  const missingHsnToCreate = new Map();

  for (const row of parsedRows) {
    const { hsnNum, gstTaxPercent } = row;

    if (
      hsnNum !== null &&
      !Number.isNaN(hsnNum) &&
      !hsnMap.has(hsnNum)
    ) {
      if (!missingHsnToCreate.has(hsnNum)) {
        missingHsnToCreate.set(hsnNum, gstTaxPercent);
      }
    }
  }

  // ---------------------------------------------------------
  // 8. Create missing HSNs using upsert
  // ---------------------------------------------------------

  if (missingHsnToCreate.size > 0) {
    const hsnBulkOps = [];

    for (const [code, gstRate] of missingHsnToCreate) {
      hsnBulkOps.push({
        updateOne: {
          filter: { code },
          update: {
            $setOnInsert: {
              code,
              gstRate:
                gstRate !== null && !Number.isNaN(gstRate)
                  ? snapToValidGstRate(gstRate)
                  : null,
              description: `HSN ${code}`,
            },
          },
          upsert: true,
        },
      });
    }

    await HsnMaster.bulkWrite(hsnBulkOps, {
      ordered: false,
    });

    const freshHsns = await HsnMaster.find({
      code: {
        $in: [...missingHsnToCreate.keys()],
      },
    })
      .select("_id code")
      .lean();

    for (const hsn of freshHsns) {
      hsnMap.set(Number(hsn.code), hsn._id);
    }
  }

  // ---------------------------------------------------------
  // 9. Prepare product updates
  // ---------------------------------------------------------

  const productUpdatesMap = new Map();

  let matchedRowsCount = 0;

  const errors = [];

  for (const row of parsedRows) {
    const {
      rowNum,
      itemCodeRaw,
      cleanedItemCode,
      hsnNum,
      gstTaxPercent,
    } = row;

    const matchedProductIds = new Set();

    if (itemCodeRaw) {
      const strRaw = String(itemCodeRaw).trim();
      const unpaddedRaw = strRaw.replace(/^0+/, "");
      const cleanKey = cleanedItemCode || cleanItemCode(strRaw);
      const unpaddedClean = cleanKey ? cleanKey.replace(/^0+/, "") : "";

      const pfMatches =
        pfItemCodeMap.get(strRaw) ||
        (cleanKey ? pfItemCodeMap.get(cleanKey) : null) ||
        (unpaddedRaw ? pfItemCodeMap.get(unpaddedRaw) : null) ||
        (unpaddedClean ? pfItemCodeMap.get(unpaddedClean) : null);

      if (pfMatches) {
        for (const productId of pfMatches) {
          matchedProductIds.add(productId);
        }
      }

      if (matchedProductIds.size === 0 && wpCodeMap.has(strRaw)) {
        matchedProductIds.add(wpCodeMap.get(strRaw));
      }
    }

    if (matchedProductIds.size === 0) {
      skippedRowsCount++;

      if (errors.length < 50) {
        errors.push({
          row: rowNum,
          itemCode: itemCodeRaw,
          reason: "No matching product found by itemCode",
        });
      }

      continue;
    }

    matchedRowsCount++;

    // -------------------------------------------------------
    // Accumulate updates
    // -------------------------------------------------------

    for (const productId of matchedProductIds) {
      let update = productUpdatesMap.get(productId);

      if (!update) {
        update = {};
        productUpdatesMap.set(productId, update);
      }

      if (
        hsnNum !== null &&
        !Number.isNaN(hsnNum)
      ) {
        update.hsn = hsnNum;

        const hsnMasterId = hsnMap.get(hsnNum);

        if (hsnMasterId) {
          update.HsnMaster = hsnMasterId;
        }
      }

      if (
        gstTaxPercent !== null &&
        !Number.isNaN(gstTaxPercent)
      ) {
        update.hsnTaxpercent = gstTaxPercent;
      }
    }
  }

  // ---------------------------------------------------------
  // 10. Bulk update WorkspaceProducts
  // ---------------------------------------------------------

  const bulkOps = [];

  for (const [productId, updateObj] of productUpdatesMap) {
    if (!Object.keys(updateObj).length) {
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: {
          _id: productId,
          workspaceId,
        },
        update: {
          $set: updateObj,
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    await WorkspaceProduct.bulkWrite(bulkOps, {
      ordered: false,
    });
  }

  // ---------------------------------------------------------
  // 11. Response
  // ---------------------------------------------------------

  return {
    totalRows: rawItems.length,
    matchedRowsCount,
    updatedProductsCount: bulkOps.length,
    skippedRowsCount,
    errors,
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
  importWorkspaceProductsGst,
};

