import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import uomMasterService from "../services/uomMaster.service.js";

/**
 * UomMaster Controller
 *
 * Manages the Platform's master UOM catalog.
 */

export const createUomMaster = asyncHandler(async (req, res) => {
  const uomMaster = await uomMasterService.createUomMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "UOM master record created successfully", uomMaster));
});

export const getUomMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await uomMasterService.getUomMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "UOM master records fetched successfully", result));
});

export const getUomMasterById = asyncHandler(async (req, res) => {
  const uomMaster = await uomMasterService.getUomMasterById(req.params.uomId);

  return res
    .status(200)
    .json(new ApiResponse(200, "UOM master record fetched successfully", uomMaster));
});

export const updateUomMaster = asyncHandler(async (req, res) => {
  const uomMaster = await uomMasterService.updateUomMaster(
    req.params.uomId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "UOM master record updated successfully", uomMaster));
});

export const deleteUomMaster = asyncHandler(async (req, res) => {
  await uomMasterService.deleteUomMaster(req.params.uomId);

  return res
    .status(200)
    .json(new ApiResponse(200, "UOM master record deleted successfully"));
});
