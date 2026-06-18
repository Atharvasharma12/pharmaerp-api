import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import uomMasterService from "../../../platform/global-catalog/uom-master/services/uomMaster.service.js";

/**
 * Catalog UomMaster Controller
 *
 * Exposes read-only views of the Platform's UOM master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/uom-master
// ---------------------
export const getCatalogUomMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await uomMasterService.getUomMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "UOM master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/uom-master/:uomId
// ---------------------
export const getCatalogUomMasterById = asyncHandler(async (req, res) => {
  const uomMaster = await uomMasterService.getUomMasterById(req.params.uomId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "UOM master record fetched successfully", uomMaster),
    );
});
