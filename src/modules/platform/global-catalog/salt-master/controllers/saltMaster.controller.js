import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import saltMasterService from "../services/saltMaster.service.js";

/**
 * SaltMaster Controller
 *
 * Manages the Platform's master Salt catalog.
 */

export const createSaltMaster = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.createSaltMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Salt master record created successfully", saltMaster));
});

export const getSaltMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await saltMasterService.getSaltMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Salt master records fetched successfully", result));
});

export const getSaltMasterById = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.getSaltMasterById(req.params.saltId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Salt master record fetched successfully", saltMaster));
});

export const getSaltMasterByName = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.getSaltMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Salt master record fetched successfully", saltMaster));
});

export const updateSaltMaster = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.updateSaltMaster(
    req.params.saltId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Salt master record updated successfully", saltMaster));
});

export const deleteSaltMaster = asyncHandler(async (req, res) => {
  await saltMasterService.deleteSaltMaster(req.params.saltId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Salt master record deleted successfully"));
});
