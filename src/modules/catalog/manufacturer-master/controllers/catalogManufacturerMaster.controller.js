import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import manufacturerMasterService from "../../../platform/global-catalog/manufacturer-master/services/manufacturerMaster.service.js";

/**
 * Catalog ManufacturerMaster Controller
 *
 * Exposes read-only views of the Platform's Manufacturer master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/manufacturer-master
// ---------------------
export const getCatalogManufacturerMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await manufacturerMasterService.getManufacturerMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Manufacturer master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/manufacturer-master/:manufacturerId
// ---------------------
export const getCatalogManufacturerMasterById = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.getManufacturerMasterById(req.params.manufacturerId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Manufacturer master record fetched successfully", manufacturerMaster),
    );
});

// ---------------------
// GET /catalog/manufacturer-master/name/:name
// ---------------------
export const getCatalogManufacturerMasterByName = asyncHandler(async (req, res) => {
  const manufacturerMaster = await manufacturerMasterService.getManufacturerMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Manufacturer master record fetched successfully", manufacturerMaster),
    );
});
