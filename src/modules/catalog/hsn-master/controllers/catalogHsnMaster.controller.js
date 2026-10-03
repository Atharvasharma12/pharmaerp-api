import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import hsnMasterService from "../../../platform/global-catalog/hsn-master/services/hsnMaster.service.js";

/**
 * Catalog HsnMaster Controller
 *
 * Exposes read-only views of the Platform's HSN / SAC master catalog
 * to regular workspace members (customers / tenants).
 *
 * Workspace users can ONLY browse and look up HSN codes.
 * They cannot create, update, or delete records — those operations
 * are restricted to the Platform module (/platform/global-catalog/hsn-master).
 */

// ---------------------
// GET /catalog/hsn-master
// ---------------------
export const getCatalogHsnMasters = asyncHandler(async (req, res) => {
  const { isActive, gstRate, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await hsnMasterService.getHsnMasters(
    { isActive: parsedIsActive, gstRate, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "HSN master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/hsn-master/code/:hsnCode
// ---------------------
export const getCatalogHsnMasterByCode = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.getHsnMasterByCode(
    req.params.hsnCode,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "HSN master record fetched successfully", hsnMaster),
    );
});

// ---------------------
// GET /catalog/hsn-master/:hsnId
// ---------------------
export const getCatalogHsnMasterById = asyncHandler(async (req, res) => {
  const hsnMaster = await hsnMasterService.getHsnMasterById(req.params.hsnId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "HSN master record fetched successfully", hsnMaster),
    );
});
