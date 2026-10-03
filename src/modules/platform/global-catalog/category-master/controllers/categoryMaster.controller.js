import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import categoryMasterService from "../services/categoryMaster.service.js";

/**
 * CategoryMaster Controller
 *
 * Manages the Platform's master Category catalog.
 */

export const createCategoryMaster = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.createCategoryMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Category master record created successfully", categoryMaster));
});

export const getCategoryMasters = asyncHandler(async (req, res) => {
  const { isActive, parentCategory, level, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  // Let "null" text represent root query filters
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
    .json(new ApiResponse(200, "Category master records fetched successfully", result));
});

export const getCategoryMasterById = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.getCategoryMasterById(req.params.categoryId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Category master record fetched successfully", categoryMaster));
});

export const getCategoryMasterBySlug = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.getCategoryMasterBySlug(req.params.slug);

  return res
    .status(200)
    .json(new ApiResponse(200, "Category master record fetched successfully", categoryMaster));
});

export const updateCategoryMaster = asyncHandler(async (req, res) => {
  const categoryMaster = await categoryMasterService.updateCategoryMaster(
    req.params.categoryId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Category master record updated successfully", categoryMaster));
});

export const deleteCategoryMaster = asyncHandler(async (req, res) => {
  await categoryMasterService.deleteCategoryMaster(req.params.categoryId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Category master record deleted successfully"));
});
