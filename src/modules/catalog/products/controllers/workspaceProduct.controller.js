import Branch from "../../../organization/branches/models/branch.model.js";
import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import workspaceProductService from "../services/workspaceProduct.service.js";
import Batch from "../models/batch.model.js";
import WorkspaceProduct from "../models/workspaceProduct.model.js";
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
  } = filters;

  const andConditions = [{ workspaceId: req.workspaceId, isDeleted: false }];

  // 1. Stock / Quantity Filters
  if (scrapOnly) {
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
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

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
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Batches fetched successfully", { batches: formattedBatches, total })
  );
});
