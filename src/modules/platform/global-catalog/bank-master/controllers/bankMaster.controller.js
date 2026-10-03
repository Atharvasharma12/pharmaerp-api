import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";

import bankMasterService from "../services/bankMaster.service.js";

/**
 * BankMaster Controller
 *
 * Manages the Platform's master Bank catalog.
 */

export const createBankMaster = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.createBankMaster(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Bank master record created successfully", bankMaster));
});

export const getBankMasters = asyncHandler(async (req, res) => {
  const { isActive, search, page, limit } = req.query;

  const parsedIsActive =
    isActive === "true" ? true : isActive === "false" ? false : undefined;

  const result = await bankMasterService.getBankMasters(
    { isActive: parsedIsActive, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Bank master records fetched successfully", result));
});

export const getBankMasterById = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.getBankMasterById(req.params.bankId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Bank master record fetched successfully", bankMaster));
});

export const getBankMasterByName = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.getBankMasterByName(
    req.params.name,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Bank master record fetched successfully", bankMaster));
});

export const updateBankMaster = asyncHandler(async (req, res) => {
  const bankMaster = await bankMasterService.updateBankMaster(
    req.params.bankId,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Bank master record updated successfully", bankMaster));
});

export const deleteBankMaster = asyncHandler(async (req, res) => {
  await bankMasterService.deleteBankMaster(req.params.bankId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Bank master record deleted successfully"));
});
