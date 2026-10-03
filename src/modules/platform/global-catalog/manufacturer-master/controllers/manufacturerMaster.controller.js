import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import manufacturerMasterService from "../services/manufacturerMaster.service.js";

/**
 * ManufacturerMaster Controller
 *
 * Manages the Platform's master Manufacturer catalog.
 */

export const createManufacturerMaster = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.createManufacturerMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Manufacturer master record created successfully", manufacturerMaster));
});

export const getManufacturerMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await manufacturerMasterService.getManufacturerMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Manufacturer master records fetched successfully", result));
});

export const getManufacturerMasterById = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.getManufacturerMasterById(req.params.manufacturerId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Manufacturer master record fetched successfully", manufacturerMaster));
});

export const getManufacturerMasterByName = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.getManufacturerMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Manufacturer master record fetched successfully", manufacturerMaster));
});

export const updateManufacturerMaster = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.updateManufacturerMaster(
    req.params.manufacturerId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Manufacturer master record updated successfully", manufacturerMaster));
});

export const deleteManufacturerMaster = asyncHandler(async (req, res) => {
  await manufacturerMasterService.deleteManufacturerMaster(req.params.manufacturerId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Manufacturer master record deleted successfully"));
});
