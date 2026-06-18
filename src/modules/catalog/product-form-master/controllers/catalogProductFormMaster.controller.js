import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import productFormMasterService from "../../../platform/global-catalog/product-form-master/services/productFormMaster.service.js";

/**
 * Catalog ProductFormMaster Controller
 *
 * Exposes read-only views of the Platform's Product Form master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/product-form-master
// ---------------------
export const getCatalogProductFormMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await productFormMasterService.getProductFormMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Product Form master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/product-form-master/:formId
// ---------------------
export const getCatalogProductFormMasterById = asyncHandler(async (req, res) => {
  const productFormMaster = await productFormMasterService.getProductFormMasterById(req.params.formId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Product Form master record fetched successfully", productFormMaster),
    );
});
