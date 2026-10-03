import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// We reuse the exact same service from the platform module
import globalProductService from "../../../platform/global-catalog/products/services/globalProduct.service.js";

/**
 * Catalog GlobalProduct Controller
 *
 * Exposes read-only views of the Platform's Global Product Catalog
 * to regular workspace members (customers/tenants).
 *
 * Workspace users can ONLY view these products and search through them.
 * They cannot create, update, or delete them.
 * When they view a product, we increment its popularity views.
 */

export const getCatalogGlobalProducts = asyncHandler(async (req, res) => {
  console.log("GET GLOBAL PRODUCTS HIT");
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

export const getCatalogGlobalProductById = asyncHandler(async (req, res) => {
  const product = await globalProductService.getGlobalProductById(
    req.params.productId,
  );

  // Increment views whenever a workspace user views the details
  await globalProductService.incrementGlobalProductViews(req.params.productId).catch(() => { });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global product fetched successfully", product),
    );
});

export const getCatalogGlobalProductByCode = asyncHandler(async (req, res) => {
  const product = await globalProductService.getGlobalProductByCode(
    req.params.productCode,
  );

  if (product) {
    // Increment views whenever a workspace user views the details
    await globalProductService.incrementGlobalProductViews(product._id).catch(() => { });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Global product fetched successfully", product),
    );
});
