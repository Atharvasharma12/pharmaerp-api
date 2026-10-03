import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import saltMasterService from "../../../platform/global-catalog/salt-master/services/saltMaster.service.js";

/**
 * Catalog SaltMaster Controller
 *
 * Exposes read-only views of the Platform's Salt master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/salt-master
// ---------------------
export const getCatalogSaltMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await saltMasterService.getSaltMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Salt master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/salt-master/name/:name
// ---------------------
export const getCatalogSaltMasterByName = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.getSaltMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Salt master record fetched successfully", saltMaster),
    );
});

// ---------------------
// GET /catalog/salt-master/:saltId
// ---------------------
export const getCatalogSaltMasterById = asyncHandler(async (req, res) => {
  const saltMaster = await saltMasterService.getSaltMasterById(req.params.saltId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Salt master record fetched successfully", saltMaster),
    );
});
