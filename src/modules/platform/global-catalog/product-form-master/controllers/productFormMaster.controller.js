import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import productFormMasterService from "../services/productFormMaster.service.js";

/**
 * ProductFormMaster Controller
 *
 * Manages the Platform's master Product Form catalog.
 */

export const createProductFormMaster = asyncHandler(async (req, res) => {
  const productFormMaster = await productFormMasterService.createProductFormMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Product Form master record created successfully", productFormMaster));
});

export const getProductFormMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await productFormMasterService.getProductFormMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product Form master records fetched successfully", result));
});

export const getProductFormMasterById = asyncHandler(async (req, res) => {
  const productFormMaster = await productFormMasterService.getProductFormMasterById(req.params.formId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Product Form master record fetched successfully", productFormMaster));
});

export const getProductFormMasterByName = asyncHandler(async (req, res) => {
  const productFormMaster = await productFormMasterService.getProductFormMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product Form master record fetched successfully", productFormMaster));
});

export const updateProductFormMaster = asyncHandler(async (req, res) => {
  const productFormMaster = await productFormMasterService.updateProductFormMaster(
    req.params.formId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product Form master record updated successfully", productFormMaster));
});

export const deleteProductFormMaster = asyncHandler(async (req, res) => {
  await productFormMasterService.deleteProductFormMaster(req.params.formId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Product Form master record deleted successfully"));
});
