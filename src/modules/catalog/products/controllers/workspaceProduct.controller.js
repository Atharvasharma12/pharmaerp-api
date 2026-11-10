import Branch from "../../../organization/branches/models/branch.model.js";
import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import workspaceProductService from "../services/workspaceProduct.service.js";
import Batch from "../models/batch.model.js";
import WorkspaceProduct from "../models/workspaceProduct.model.js";
import ProductFacility from "../models/productFacility.model.js";
import StockAdjustment from "../models/stockAdjustment.model.js";
import mongoose from "mongoose";

/**
 * WorkspaceProduct Controller
 *
 * Architecture context (gpnotes.md):
 * ────────────────────────────────────
 * - Workspace Products exist only when no matching Global Product is found.
 * - All operations are scoped to req.workspaceId (set by workspaceContextMiddleware).
 * - productType is immutable after creation.
 * - HsnMaster is populated on all GET responses.
 * - Downstream modules (Inventory, Batch, Purchase, Sales) reference these as:
 *     { productSource: "WORKSPACE", productId: ObjectId }
 */

/**
 * Search the global catalog before creating a workspace product.
 * The frontend should call this first, show suggestions, and only
 * call POST /products if the user explicitly wants a workspace product.
 */
export const searchBeforeCreateWorkspaceProduct = asyncHandler(async (req, res) => {
  const { name, productType } = req.query;

  const result = await workspaceProductService.searchBeforeCreate(
    name,
    req.workspaceId,
    productType || null,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Product search completed", result),
    );
});

export const createWorkspaceProduct = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.createWorkspaceProduct(
    req.workspaceId,
    req.body,
    req.user,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Workspace product created successfully", product),
    );
});

export const getWorkspaceProducts = asyncHandler(async (req, res) => {
  const {
    status,
    productType,
    search,
    page,
    limit,
    branchId: requestedBranchId,
    summary,
  } = req.query;

  const result = await workspaceProductService.getWorkspaceProducts(
    req.workspaceId,
    { status, productType, search, branchId: requestedBranchId || null },
    {
      page,
      limit,
      ...(summary
        ? {
            select:
              "_id workspaceProductCode productType name manufacturer pack category productForm status",
            summary: true,
          }
        : {}),
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace products fetched successfully", result),
    );
});

export const getWorkspaceProductById = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.getWorkspaceProductById(
    req.params.productId,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product fetched successfully", product),
    );
});

export const getWorkspaceProductByCode = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.getWorkspaceProductByCode(
    req.params.productCode,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product fetched successfully", product),
    );
});

export const updateWorkspaceProduct = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.updateWorkspaceProduct(
    req.params.productId,
    req.workspaceId,
    req.body,
    req.user,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product updated successfully", product),
    );
});

export const deleteWorkspaceProduct = asyncHandler(async (req, res) => {
  await workspaceProductService.deleteWorkspaceProduct(
    req.params.productId,
    req.workspaceId,
    req.user,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace product deleted successfully"));
});

export const detectInventoryProducts = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Please upload a file (.xls, .xlsx, .csv)"));
  }

  const result = await workspaceProductService.detectInventoryProducts(
    req.workspaceId,
    req.file.buffer
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Inventory detected successfully", result));
});

export const importWorkspaceProducts = asyncHandler(async (req, res) => {
  const { items, branchId, tempImportId, brandMappings } = req.body || {};
  const file = req.file;

  if (!file && !tempImportId && (!Array.isArray(items) || items.length === 0)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Please upload a file, provide tempImportId, or pass items array"));
  }

  const result = await workspaceProductService.importWorkspaceProducts(
    req.workspaceId,
    items,
    req.user,
    { branchId, file, tempImportId, brandMappings },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Products imported successfully", result),
    );
});

export const importWorkspaceProductsGst = asyncHandler(async (req, res) => {
  const file = req.file;
  const { items } = req.body || {};

  if (!file && (!Array.isArray(items) || items.length === 0)) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Please upload a file or pass items array"));
  }

  const result = await workspaceProductService.importWorkspaceProductsGst(
    req.workspaceId,
    items,
    req.user,
    { file },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "GST & HSN updated successfully", result),
    );
});

export const getProductFacilityBatchesByQueryV2 = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, filters = {}, search = "" } = req.body;
  page = Number(page);
  limit = Number(limit);

  const {
    product,
    facility,
    facility_id,
    branch_id,
    expiryDate,
    expired,
    expiredOnly,
    scrapOnly,
    lowStock,
    inStockOnly,
    motive,
  } = filters;

  const andConditions = [{ workspaceId: req.workspaceId, isDeleted: false }];

  // 1. Stock / Quantity Filters
  if (motive === "shelf_expired") {
    // Shelf-expired retail stock only
    andConditions.push({
      batchQty: { $gt: 0 },
      expiryDate: { $exists: true, $ne: "" },
    });
  } else if (motive === "scrap_expired") {
    // Scrap bin: expired returns only
    andConditions.push({
      expiredQty: { $gt: 0 },
    });
  } else if (motive === "broken") {
    // Scrap bin: broken returns only
    andConditions.push({
      brokenQty: { $gt: 0 },
    });
  } else if (motive === "all" || scrapOnly) {
    // "all" in scrap register or scrapOnly: ONLY quarantine scrap bin items (excluding shelf stock)
    andConditions.push({
      $or: [
        { scrapQty: { $gt: 0 } },
        { brokenQty: { $gt: 0 } },
        { expiredQty: { $gt: 0 } },
      ],
    });
  } else if (expiredOnly || expired) {
    andConditions.push({
      $or: [
        { scrapQty: { $gt: 0 } },
        { brokenQty: { $gt: 0 } },
        { expiredQty: { $gt: 0 } },
        { batchQty: { $gt: 0 }, expiryDate: { $exists: true, $ne: "" } },
      ],
    });
  } else if (lowStock) {
    andConditions.push({
      batchQty: inStockOnly ? { $gt: 0, $lt: 10 } : { $lt: 10 },
    });
  } else if (inStockOnly) {
    andConditions.push({
      batchQty: { $gt: 0 },
    });
  }

  // 2. Product Filter
  if (product) {
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json(new ApiResponse(400, "Invalid product ID"));
    }
    andConditions.push({ product: new mongoose.Types.ObjectId(product) });
  }

  // 3. Branch / Facility Scoping
  const targetFacility = facility || facility_id || branch_id;
  if (targetFacility && targetFacility !== "all_facility") {
    if (!mongoose.Types.ObjectId.isValid(targetFacility)) {
      return res.status(400).json(new ApiResponse(400, "Invalid facility ID"));
    }
    andConditions.push({ branch_id: new mongoose.Types.ObjectId(targetFacility) });
  } else {
    // If the companyId is sent via headers or body but NOT in req.companyId because companyContextMiddleware is missing
    const extractedCompanyId = req.companyId || req.headers["x-company-id"] || req.body.companyId;
    if (extractedCompanyId) {
      const Branch = mongoose.model("Branch");
      const validBranches = await Branch.find({ companyId: extractedCompanyId, isDeleted: false }).select("_id").lean();
      andConditions.push({ branch_id: { $in: validBranches.map((b) => b._id) } });
    } else {
      // Prevent cross-company data leakage by defaulting to an impossible match if companyId is completely missing
      andConditions.push({ branch_id: null });
    }
  }

  // 4. Search Filter (by Product Name, Product Code, or Batch No)
  if (search && !product) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchedProducts = await WorkspaceProduct.find({
      workspaceId: req.workspaceId,
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { displayName: { $regex: escaped, $options: "i" } },
        { workspaceProductCode: { $regex: escaped, $options: "i" } },
      ],
    }).select("_id");

    andConditions.push({
      $or: [
        { product: { $in: matchedProducts.map((p) => p._id) } },
        { batchNo: { $regex: escaped, $options: "i" } },
        { originalBatchNo: { $regex: escaped, $options: "i" } },
      ],
    });
  }

  const matchStage = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

  const total = await Batch.countDocuments(matchStage);
  const batches = await Batch.find(matchStage)
    .populate("product")
    .populate("branch_id", "name code")
    .populate({
      path: "purchaseBillId",
      select: "supplierId purchaseBillNo invoiceDate",
      populate: {
        path: "supplierId",
        select: "businessName name gstNumber mobile phone email address",
      },
    })
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Fallback: Enrich batches missing direct purchaseBillId with matching PurchaseBill by product & batch
  const batchesNeedingSupplier = batches.filter(
    (b) => !b.purchaseBillId?.supplierId && b.product
  );
  if (batchesNeedingSupplier.length > 0) {
    const PurchaseBill = mongoose.model("PurchaseBill");
    await Promise.all(
      batchesNeedingSupplier.map(async (b) => {
        const prodId = b.product?._id || b.product;
        try {
          const bill = await PurchaseBill.findOne({
            workspaceId: req.workspaceId,
            isDeleted: false,
            $or: [
              { "items.productId": prodId, "items.batch": b.batchNo },
              { "items.productId": prodId },
            ],
          })
            .populate("supplierId", "businessName name gstNumber mobile phone email address")
            .sort({ invoiceDate: -1, createdAt: -1 })
            .select("supplierId purchaseBillNo invoiceDate")
            .lean();
          if (bill?.supplierId) {
            b.purchaseBillId = bill;
          }
        } catch {
          // ignore lookup error
        }
      })
    );
  }

  const formattedBatches = batches.map((b) => {
    let exp = b.expiryDate || "";
    if (exp.toLowerCase() === "active" || exp.toLowerCase() === "inactive") {
      exp = "";
    }
    const baseCleanBatchNo =
      b.originalBatchNo || (b.batchNo ? b.batchNo.replace(/\s*\[(EXPIRED|BROKEN|SCRAP)\]/gi, "").trim() : "");
    const resolvedScrapType =
      b.scrapType || (b.brokenQty > 0 ? "BROKEN" : b.expiredQty > 0 ? "EXPIRED" : "NONE");

    const branchName = b.branch_id?.name || "Main Branch";
    const branchCode = b.branch_id?.code || "";
    const rawBranchId = b.branch_id?._id ? b.branch_id._id.toString() : (b.branch_id ? b.branch_id.toString() : null);
    const rawProductId = b.product?._id ? b.product._id.toString() : (b.product ? b.product.toString() : null);

    const supplierDoc = b.purchaseBillId?.supplierId || null;
    const supplierId = supplierDoc?._id ? supplierDoc._id.toString() : null;
    const supplierName = supplierDoc?.businessName || supplierDoc?.name || "";
    const supplierGst = supplierDoc?.gstNumber || "";
    const supplierMobile = supplierDoc?.mobile || supplierDoc?.phone || "";

    return {
      ...b,
      branchName,
      branchCode,
      branchId: rawBranchId,
      branch_id: rawBranchId,
      facility_id: rawBranchId,
      productId: rawProductId,
      product: rawProductId,
      productDoc: typeof b.product === "object" ? b.product : null,
      name: b.product?.name || "N/A",
      productName: b.product?.name || "N/A",
      productCode: b.product?.workspaceProductCode || b.product?.code || "—",
      manufacturer: b.product?.manufacturer || b.product?.marketer || "N/A",
      pack: b.product?.pack || "N/A",
      stock: Number(b.batchQty || 0),
      qty: Number(b.batchQty || 0),
      batchQty: Number(b.batchQty || 0),
      scrapQty: Number(b.scrapQty || 0),
      brokenQty: Number(b.brokenQty || 0),
      expiredQty: Number(b.expiredQty || 0),
      batchNo: b.batchNo,
      originalBatchNo: baseCleanBatchNo,
      scrapType: resolvedScrapType,
      expiryDate: exp,
      expiry: exp,
      rack: b.rack || b.product?.rack || "",
      supplier: supplierDoc,
      supplierId,
      supplierName,
      supplierGst,
      supplierMobile,
      purchaseBillId: b.purchaseBillId?._id ? b.purchaseBillId._id.toString() : null,
      purchaseBillNo: b.purchaseBillId?.purchaseBillNo || "",
    };
  });

  // 5. Aggregate tab counts for expired/scrap registers
  let counts = null;
  if (motive !== undefined || scrapOnly || expiredOnly) {
    const baseScope = {
      workspaceId: req.workspaceId,
      isDeleted: false,
    };
    if (targetFacility && targetFacility !== "all_facility" && mongoose.Types.ObjectId.isValid(targetFacility)) {
      baseScope.branch_id = new mongoose.Types.ObjectId(targetFacility);
    } else {
      const extractedCompanyId = req.companyId || req.headers["x-company-id"] || req.body.companyId;
      if (extractedCompanyId) {
        const Branch = mongoose.model("Branch");
        const validBranches = await Branch.find({ companyId: extractedCompanyId, isDeleted: false }).select("_id").lean();
        baseScope.branch_id = { $in: validBranches.map((b) => b._id) };
      }
    }

    const [totalScrapBin, totalShelfExpired, totalScrapExpired, totalBroken] = await Promise.all([
      Batch.countDocuments({
        ...baseScope,
        $or: [{ scrapQty: { $gt: 0 } }, { brokenQty: { $gt: 0 } }, { expiredQty: { $gt: 0 } }],
      }),
      Batch.countDocuments({
        ...baseScope,
        batchQty: { $gt: 0 },
        expiryDate: { $exists: true, $ne: "" },
      }),
      Batch.countDocuments({
        ...baseScope,
        expiredQty: { $gt: 0 },
      }),
      Batch.countDocuments({
        ...baseScope,
        brokenQty: { $gt: 0 },
      }),
    ]);

    counts = {
      all: totalScrapBin,
      shelfExpired: totalShelfExpired,
      scrapExpired: totalScrapExpired,
      broken: totalBroken,
    };
  }

  return res.status(200).json(
    new ApiResponse(200, "Batches fetched successfully", {
      batches: formattedBatches,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      counts,
    })
  );
});

/**
 * Move shelf-expired batches into branch quarantine scrap bin
 * POST /catalog/products/workspace-product/batches/move-to-scrap-bin
 */
export const moveBatchesToScrapBin = asyncHandler(async (req, res) => {
  const { branchId: reqBranchId, items } = req.body;
  const branchId = reqBranchId || req.headers["x-branch-id"] || req.user?.branch_id;

  if (!branchId) {
    return res.status(400).json(new ApiResponse(400, "Branch ID is required"));
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json(new ApiResponse(400, "Items list cannot be empty"));
  }

  const workspaceId = req.workspaceId;
  const branchObjId = mongoose.Types.ObjectId.isValid(branchId)
    ? new mongoose.Types.ObjectId(branchId)
    : branchId;
  const workspaceObjId = mongoose.Types.ObjectId.isValid(workspaceId)
    ? new mongoose.Types.ObjectId(workspaceId)
    : workspaceId;

  let session = null;
  let inTransaction = false;
  try {
    session = await mongoose.startSession();
    try {
      session.startTransaction();
      inTransaction = true;
    } catch {
      inTransaction = false;
    }
  } catch {
    session = null;
  }

  const sessionOpt = session ? { session } : {};

  try {
    const movedItems = [];

    for (const item of items) {
      const batchId = item.batchId || item._id || item.batch;
      if (!batchId) continue;

      // 1. Find source shelf batch
      const query = {
        _id: batchId,
        workspaceId: workspaceObjId,
        branch_id: branchObjId,
      };
      const sourceBatch = session
        ? await Batch.findOne(query).session(session)
        : await Batch.findOne(query);

      if (!sourceBatch) {
        continue;
      }

      // Quantity to move: if not explicitly specified, move all remaining batchQty
      const availableQty = Math.max(0, Number(sourceBatch.batchQty) || 0);
      const requestedQty = Number(item.qty);
      const qtyToMove =
        !isNaN(requestedQty) && requestedQty > 0
          ? Math.min(requestedQty, availableQty)
          : availableQty;

      if (qtyToMove <= 0) {
        continue;
      }

      // 2. Decrement shelf batchQty
      sourceBatch.batchQty = Math.max(0, availableQty - qtyToMove);
      await sourceBatch.save(sessionOpt);

      // 3. Resolve destination scrap batch
      const rawBatchNo = sourceBatch.batchNo || "";
      const baseBatchNo =
        sourceBatch.originalBatchNo ||
        rawBatchNo.replace(/\s*\[(EXPIRED|BROKEN|SCRAP)\]/gi, "").trim();
      const targetBatchNo = `${baseBatchNo} [EXPIRED]`;
      const productId = sourceBatch.product;

      let scrapBatch = session
        ? await Batch.findOne({
            workspaceId: workspaceObjId,
            branch_id: branchObjId,
            product: productId,
            batchNo: targetBatchNo,
          }).session(session)
        : await Batch.findOne({
            workspaceId: workspaceObjId,
            branch_id: branchObjId,
            product: productId,
            batchNo: targetBatchNo,
          });

      if (scrapBatch) {
        scrapBatch.scrapQty = (Number(scrapBatch.scrapQty) || 0) + qtyToMove;
        scrapBatch.expiredQty = (Number(scrapBatch.expiredQty) || 0) + qtyToMove;
        scrapBatch.scrapType = "EXPIRED";
        scrapBatch.originalBatchNo = baseBatchNo;
        scrapBatch.isDeleted = false;
        if (!scrapBatch.expiryDate && sourceBatch.expiryDate) {
          scrapBatch.expiryDate = sourceBatch.expiryDate;
        }
        await scrapBatch.save(sessionOpt);
      } else {
        try {
          const created = await Batch.create(
            [
              {
                workspaceId: workspaceObjId,
                branch_id: branchObjId,
                product: productId,
                batchNo: targetBatchNo,
                originalBatchNo: baseBatchNo,
                scrapType: "EXPIRED",
                batchQty: 0,
                scrapQty: qtyToMove,
                brokenQty: 0,
                expiredQty: qtyToMove,
                mrp: sourceBatch.mrp || sourceBatch.MRP || 0,
                MRP: sourceBatch.mrp || sourceBatch.MRP || 0,
                rate: sourceBatch.rate || 0,
                ptr: sourceBatch.ptr || 0,
                pts: sourceBatch.pts || 0,
                rateA: sourceBatch.rateA || sourceBatch.rate || 0,
                rateB: sourceBatch.rateB || sourceBatch.rate || 0,
                rateC: sourceBatch.rateC || sourceBatch.rate || 0,
                expiryDate: sourceBatch.expiryDate || "",
                pack: sourceBatch.pack || "PCS",
                rack: sourceBatch.rack || "",
                isDeleted: false,
              },
            ],
            sessionOpt
          );
          scrapBatch = created[0];
        } catch (createErr) {
          if (createErr.code === 11000) {
            scrapBatch = session
              ? await Batch.findOne({
                  workspaceId: workspaceObjId,
                  branch_id: branchObjId,
                  product: productId,
                  batchNo: targetBatchNo,
                }).session(session)
              : await Batch.findOne({
                  workspaceId: workspaceObjId,
                  branch_id: branchObjId,
                  product: productId,
                  batchNo: targetBatchNo,
                });
            if (scrapBatch) {
              scrapBatch.scrapQty = (Number(scrapBatch.scrapQty) || 0) + qtyToMove;
              scrapBatch.expiredQty = (Number(scrapBatch.expiredQty) || 0) + qtyToMove;
              scrapBatch.scrapType = "EXPIRED";
              scrapBatch.originalBatchNo = baseBatchNo;
              scrapBatch.isDeleted = false;
              await scrapBatch.save(sessionOpt);
            }
          } else {
            throw createErr;
          }
        }
      }

      // 4. Update ProductFacility
      await ProductFacility.findOneAndUpdate(
        {
          workspaceId: workspaceObjId,
          facility_id: branchObjId,
          product_id: productId,
        },
        {
          $inc: {
            total_qty_available: -qtyToMove,
            qoh: -qtyToMove,
            atp: -qtyToMove,
            scrapQty: qtyToMove,
            expiredQty: qtyToMove,
          },
          $setOnInsert: {
            itemCode: sourceBatch.productCode || "",
            consumption: 0,
            poStatus: "NONE",
            isDeleted: false,
          },
        },
        { upsert: true, ...sessionOpt }
      );

      movedItems.push({
        batchId: sourceBatch._id,
        batchNo: sourceBatch.batchNo,
        targetBatchNo,
        qtyMoved: qtyToMove,
      });
    }

    if (inTransaction && session) {
      await session.commitTransaction();
    }

    return res.status(200).json(
      new ApiResponse(200, "Successfully moved items to branch scrap bin", {
        movedCount: movedItems.length,
        items: movedItems,
      })
    );
  } catch (err) {
    if (inTransaction && session) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

/**
 * Add Expired or Broken Stock Adjustment
 * POST /catalog/products/workspace-product/stock-adjustments/expired-broken
 */
export const addExpiredBrokenStock = asyncHandler(async (req, res) => {
  const {
    branchId: reqBranchId,
    productId,
    batchId,
    quantity: rawQuantity,
    reason: rawReason,
    remarks,
  } = req.body;
  const branchId = reqBranchId || req.headers["x-branch-id"] || req.user?.branch_id;

  if (!branchId) {
    return res.status(400).json(new ApiResponse(400, "Branch ID is required"));
  }

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json(new ApiResponse(400, "Valid Product ID is required"));
  }

  if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
    return res.status(400).json(new ApiResponse(400, "Valid Batch ID is required"));
  }

  const quantity = Number(rawQuantity);
  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json(new ApiResponse(400, "Quantity must be a positive number"));
  }

  const normalizedReason = String(rawReason || "").toUpperCase().trim();
  if (!["EXPIRED", "BROKEN"].includes(normalizedReason)) {
    return res.status(400).json(new ApiResponse(400, "Reason must be either 'EXPIRED' or 'BROKEN'"));
  }

  const workspaceId = req.workspaceId;
  const branchObjId = mongoose.Types.ObjectId.isValid(branchId)
    ? new mongoose.Types.ObjectId(branchId)
    : branchId;
  const workspaceObjId = mongoose.Types.ObjectId.isValid(workspaceId)
    ? new mongoose.Types.ObjectId(workspaceId)
    : workspaceId;
  const productObjId = new mongoose.Types.ObjectId(productId);
  const batchObjId = new mongoose.Types.ObjectId(batchId);

  let session = null;
  let inTransaction = false;
  try {
    session = await mongoose.startSession();
    try {
      session.startTransaction();
      inTransaction = true;
    } catch {
      inTransaction = false;
    }
  } catch {
    session = null;
  }

  const sessionOpt = session ? { session } : {};

  try {
    // 1. Find source shelf batch
    const sourceBatch = session
      ? await Batch.findOne({
          _id: batchObjId,
          workspaceId: workspaceObjId,
          branch_id: branchObjId,
          product: productObjId,
        }).session(session)
      : await Batch.findOne({
          _id: batchObjId,
          workspaceId: workspaceObjId,
          branch_id: branchObjId,
          product: productObjId,
        });

    if (!sourceBatch) {
      if (inTransaction && session) await session.abortTransaction();
      return res
        .status(404)
        .json(new ApiResponse(404, "Selected batch not found in the current branch"));
    }

    const availableQty = Math.max(0, Number(sourceBatch.batchQty) || 0);
    if (quantity > availableQty) {
      if (inTransaction && session) await session.abortTransaction();
      return res.status(400).json(
        new ApiResponse(
          400,
          `Entered quantity (${quantity}) exceeds available batch quantity (${availableQty})`
        )
      );
    }

    // 2. Decrement source shelf batch
    sourceBatch.batchQty = Math.max(0, availableQty - quantity);
    await sourceBatch.save(sessionOpt);

    // 3. Resolve destination scrap batch
    const tag = normalizedReason === "BROKEN" ? "[BROKEN]" : "[EXPIRED]";
    const rawBatchNo = sourceBatch.batchNo || "";
    const baseBatchNo =
      sourceBatch.originalBatchNo ||
      rawBatchNo.replace(/\s*\[(EXPIRED|BROKEN|SCRAP)\]/gi, "").trim();
    const targetBatchNo = `${baseBatchNo} ${tag}`;

    let scrapBatch = session
      ? await Batch.findOne({
          workspaceId: workspaceObjId,
          branch_id: branchObjId,
          product: productObjId,
          batchNo: targetBatchNo,
        }).session(session)
      : await Batch.findOne({
          workspaceId: workspaceObjId,
          branch_id: branchObjId,
          product: productObjId,
          batchNo: targetBatchNo,
        });

    if (scrapBatch) {
      scrapBatch.scrapQty = (Number(scrapBatch.scrapQty) || 0) + quantity;
      if (normalizedReason === "BROKEN") {
        scrapBatch.brokenQty = (Number(scrapBatch.brokenQty) || 0) + quantity;
      } else {
        scrapBatch.expiredQty = (Number(scrapBatch.expiredQty) || 0) + quantity;
      }
      scrapBatch.scrapType = normalizedReason;
      scrapBatch.originalBatchNo = baseBatchNo;
      scrapBatch.isDeleted = false;
      if (!scrapBatch.expiryDate && sourceBatch.expiryDate) {
        scrapBatch.expiryDate = sourceBatch.expiryDate;
      }
      await scrapBatch.save(sessionOpt);
    } else {
      try {
        const created = await Batch.create(
          [
            {
              workspaceId: workspaceObjId,
              branch_id: branchObjId,
              product: productObjId,
              batchNo: targetBatchNo,
              originalBatchNo: baseBatchNo,
              scrapType: normalizedReason,
              batchQty: 0,
              scrapQty: quantity,
              brokenQty: normalizedReason === "BROKEN" ? quantity : 0,
              expiredQty: normalizedReason === "EXPIRED" ? quantity : 0,
              mrp: sourceBatch.mrp || sourceBatch.MRP || 0,
              MRP: sourceBatch.mrp || sourceBatch.MRP || 0,
              rate: sourceBatch.rate || 0,
              ptr: sourceBatch.ptr || 0,
              pts: sourceBatch.pts || 0,
              rateA: sourceBatch.rateA || sourceBatch.rate || 0,
              rateB: sourceBatch.rateB || sourceBatch.rate || 0,
              rateC: sourceBatch.rateC || sourceBatch.rate || 0,
              expiryDate: sourceBatch.expiryDate || "",
              pack: sourceBatch.pack || "PCS",
              rack: sourceBatch.rack || "",
              isDeleted: false,
            },
          ],
          sessionOpt
        );
        scrapBatch = created[0];
      } catch (createErr) {
        if (createErr.code === 11000) {
          scrapBatch = session
            ? await Batch.findOne({
                workspaceId: workspaceObjId,
                branch_id: branchObjId,
                product: productObjId,
                batchNo: targetBatchNo,
              }).session(session)
            : await Batch.findOne({
                workspaceId: workspaceObjId,
                branch_id: branchObjId,
                product: productObjId,
                batchNo: targetBatchNo,
              });
          if (scrapBatch) {
            scrapBatch.scrapQty = (Number(scrapBatch.scrapQty) || 0) + quantity;
            if (normalizedReason === "BROKEN") {
              scrapBatch.brokenQty = (Number(scrapBatch.brokenQty) || 0) + quantity;
            } else {
              scrapBatch.expiredQty = (Number(scrapBatch.expiredQty) || 0) + quantity;
            }
            scrapBatch.scrapType = normalizedReason;
            scrapBatch.originalBatchNo = baseBatchNo;
            scrapBatch.isDeleted = false;
            await scrapBatch.save(sessionOpt);
          }
        } else {
          throw createErr;
        }
      }
    }

    // 4. Update ProductFacility
    const facilityInc = {
      total_qty_available: -quantity,
      qoh: -quantity,
      atp: -quantity,
      scrapQty: quantity,
    };
    if (normalizedReason === "BROKEN") {
      facilityInc.brokenQty = quantity;
    } else {
      facilityInc.expiredQty = quantity;
    }

    await ProductFacility.findOneAndUpdate(
      {
        workspaceId: workspaceObjId,
        facility_id: branchObjId,
        product_id: productObjId,
      },
      {
        $inc: facilityInc,
        $setOnInsert: {
          itemCode: sourceBatch.productCode || "",
          consumption: 0,
          poStatus: "NONE",
          isDeleted: false,
        },
      },
      { upsert: true, ...sessionOpt }
    );

    // 5. Create StockAdjustment record
    const unitCost = Number(sourceBatch.rate || sourceBatch.ptr || 0);
    const mrp = Number(sourceBatch.mrp || sourceBatch.MRP || 0);
    const totalLossValue = (mrp > 0 ? mrp : unitCost) * quantity;

    const adjustmentRecord = new StockAdjustment({
      workspaceId: workspaceObjId,
      facility_id: branchObjId,
      branch_id: branchObjId,
      product: productObjId,
      sourceBatch: sourceBatch._id,
      targetScrapBatch: scrapBatch ? scrapBatch._id : null,
      quantity,
      reason: normalizedReason,
      remarks: remarks || "",
      unitCost,
      mrp,
      totalLossValue,
      adjustmentDate: new Date(),
      performedBy: req.user?._id || null,
    });

    await adjustmentRecord.save(sessionOpt);

    if (inTransaction && session) {
      await session.commitTransaction();
    }

    return res.status(200).json(
      new ApiResponse(200, "Stock marked as expired/broken successfully", {
        adjustment: adjustmentRecord,
        sourceBatch: {
          _id: sourceBatch._id,
          batchNo: sourceBatch.batchNo,
          remainingBatchQty: sourceBatch.batchQty,
        },
        targetScrapBatch: scrapBatch
          ? {
              _id: scrapBatch._id,
              batchNo: scrapBatch.batchNo,
              scrapQty: scrapBatch.scrapQty,
              scrapType: scrapBatch.scrapType,
            }
          : null,
      })
    );
  } catch (err) {
    if (inTransaction && session) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});
