import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

// Reuse the exact same service from the platform module (read operations only)
import bankMasterService from "../../../platform/global-catalog/bank-master/services/bankMaster.service.js";

/**
 * Catalog BankMaster Controller
 *
 * Exposes read-only views of the Platform's Bank master catalog
 * to regular workspace members (customers / tenants).
 */

// ---------------------
// GET /catalog/bank-master
// ---------------------
export const getCatalogBankMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  // Parse isActive query string → boolean
  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await bankMasterService.getBankMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Bank master records fetched successfully", result),
    );
});

// ---------------------
// GET /catalog/bank-master/:bankId
// ---------------------
export const getCatalogBankMasterById = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.getBankMasterById(req.params.bankId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Bank master record fetched successfully", bankMaster),
    );
});

// ---------------------
// GET /catalog/bank-master/name/:name
// ---------------------
export const getCatalogBankMasterByName = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.getBankMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Bank master record fetched successfully", bankMaster),
    );
});
