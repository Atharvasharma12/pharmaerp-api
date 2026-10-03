import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import categoryMasterService from "../../../platform/global-catalog/category-master/services/categoryMaster.service.js";

/**
 * Catalog CategoryMaster Controller
 *
 * Exposes read-only views of the Platform's Category master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/category-master
// ---------------------
export const getCatalogCategoryMasters = asyncHandler(async (req, res) => {
  const { isActive, parentCategory, level, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const parsedParentCategory = parentCategory === "null" ? null : parentCategory;

  const result = await categoryMasterService.getCategoryMasters(
    {
      isActive: parsedIsActive,
      parentCategory: parsedParentCategory,
      level,
      search,
    },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Category master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/category-master/slug/:slug
// ---------------------
export const getCatalogCategoryMasterBySlug = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.getCategoryMasterBySlug(req.params.slug);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Category master record fetched successfully", categoryMaster),
    );
});

// ---------------------
// GET /catalog/category-master/:categoryId
// ---------------------
export const getCatalogCategoryMasterById = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.getCategoryMasterById(req.params.categoryId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Category master record fetched successfully", categoryMaster),
    );
});
