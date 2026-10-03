import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import financialPeriodService from "../services/financialPeriod.service.js";

export const createPeriod = asyncHandler(async (req, res) => {
  const period = await financialPeriodService.createFinancialPeriod(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Financial period created successfully", period));
});

export const getPeriods = asyncHandler(async (req, res) => {
  const result = await financialPeriodService.getFinancialPeriods(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Financial periods fetched successfully", result));
});

export const getCurrentPeriod = asyncHandler(async (req, res) => {
  const period = await financialPeriodService.getCurrentPeriod(
    req.workspaceId,
    req.companyId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Current financial period fetched successfully", period));
});

export const updatePeriodStatus = asyncHandler(async (req, res) => {
  const period = await financialPeriodService.updatePeriodStatus(
    req.params.periodId,
    req.companyId,
    req.workspaceId,
    req.body.status,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Financial period status updated successfully", period));
});
