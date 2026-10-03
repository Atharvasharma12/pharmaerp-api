import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import globalProductService from "../services/globalProduct.service.js";

/**
 * GlobalProduct Controller
 *
 * This controller manages the Platform's master Global Product Catalog.
 *
 * Architecture context (gpnotes.md):
 * ────────────────────────────────────
 * - Global Products are shared across all workspaces.
 * - They store master medicine/OTC information.
 * - They do NOT store pricing (MRP/PTR/PTS), stock, rack, or inventory data.
 * - HsnMaster reference is populated on all GET responses.
 * - views counter tracks product popularity across the platform.
 * - Workspace modules reference global products via:
 *     { productSource: "GLOBAL", productId: ObjectId }
 *   and resolve them through catalog/product-resolver/.
 */

export const createGlobalProduct = asyncHandler(async (req, res) => {
  const product = await globalProductService.createGlobalProduct(
    req.body,
    req.platformUser,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Global product created successfully", product));
});

export const getGlobalProducts = asyncHandler(async (req, res) => {
  const { status, productType, dataSource, search, page, limit } = req.query;

  const result = await globalProductService.getGlobalProducts(
    { status, productType, dataSource, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global products fetched successfully", result),
    );
});

export const getGlobalProductById = asyncHandler(async (req, res) => {
  const product = await globalProductService.getGlobalProductById(
    req.params.productId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global product fetched successfully", product),
    );
});

export const getGlobalProductByCode = asyncHandler(async (req, res) => {
  const product = await globalProductService.getGlobalProductByCode(
    req.params.productCode,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global product fetched successfully", product),
    );
});

export const updateGlobalProduct = asyncHandler(async (req, res) => {
  const product = await globalProductService.updateGlobalProduct(
    req.params.productId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global product updated successfully", product),
    );
});

export const deleteGlobalProduct = asyncHandler(async (req, res) => {
  await globalProductService.deleteGlobalProduct(
    req.params.productId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Global product deleted successfully"));
});

/**
 * Increment views for a product.
 * Called by workspace consumers when they view a product detail.
 * views is a popularity metric stored on GlobalProduct per architecture design.
 */
export const incrementGlobalProductViews = asyncHandler(async (req, res) => {
  const product = await globalProductService.incrementGlobalProductViews(
    req.params.productId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product views updated", product));
});
