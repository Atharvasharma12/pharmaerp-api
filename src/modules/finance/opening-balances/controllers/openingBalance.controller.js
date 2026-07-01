import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import openingBalanceService from "../services/openingBalance.service.js";

export const setAccountOpeningBalance = asyncHandler(async (req, res) => {
  const result = await openingBalanceService.setAccountOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Account opening balance set successfully", result),
    );
});

export const setCustomerOpeningBalance = asyncHandler(async (req, res) => {
  const result = await openingBalanceService.setCustomerOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Customer opening balance set successfully", result),
    );
});

export const setSupplierOpeningBalance = asyncHandler(async (req, res) => {
  const result = await openingBalanceService.setSupplierOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Supplier opening balance set successfully", result),
    );
});

export const setBankAccountOpeningBalance = asyncHandler(async (req, res) => {
  const result = await openingBalanceService.setBankAccountOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Bank Account opening balance set successfully",
        result,
      ),
    );
});

export const setCashAccountOpeningBalance = asyncHandler(async (req, res) => {
  const result = await openingBalanceService.setCashAccountOpeningBalance(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Cash Account opening balance set successfully",
        result,
      ),
    );
});
