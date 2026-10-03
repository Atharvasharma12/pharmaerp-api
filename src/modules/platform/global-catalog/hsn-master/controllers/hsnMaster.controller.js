import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import hsnMasterService from "../services/hsnMaster.service.js";

/**
 * HsnMaster Controller
 *
 * Manages the Platform's master HSN / SAC code catalog.
 *
 * Architecture context:
 * ─────────────────────────────────────────────────────────
 * - HsnMaster is the single source of truth for GST / tax classification.
 * - GlobalProducts reference HsnMaster via ObjectId — GST data is never
 *   inlined inside product records.
 * - code is immutable after creation.
 */

export const createHsnMaster = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.createHsnMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "HSN master record created successfully", hsnMaster));
});

export const getHsnMasters = asyncHandler(async (req, res) => {
  const { isActive, gstRate, search, page, limit } = req.query;

  // Parse isActive string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await hsnMasterService.getHsnMasters(
    { isActive: parsedIsActive, gstRate, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "HSN master records fetched successfully", result));
});

export const getHsnMasterById = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.getHsnMasterById(req.params.hsnId);

  return res
    .status(200)
    .json(new ApiResponse(200, "HSN master record fetched successfully", hsnMaster));
});

export const getHsnMasterByCode = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.getHsnMasterByCode(
    req.params.hsnCode,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "HSN master record fetched successfully", hsnMaster));
});

export const updateHsnMaster = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.updateHsnMaster(
    req.params.hsnId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "HSN master record updated successfully", hsnMaster));
});

export const deleteHsnMaster = asyncHandler(async (req, res) => {
  await hsnMasterService.deleteHsnMaster(req.params.hsnId);

  return res
    .status(200)
    .json(new ApiResponse(200, "HSN master record deleted successfully"));
});
