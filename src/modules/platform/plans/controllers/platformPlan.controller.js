import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformPlanService from "../services/platformPlan.service.js";

export const createPlatformPlan = asyncHandler(async (req, res) => {
  const plan = await platformPlanService.createPlatformPlan(
    req.body,
    req.platformUser,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Plan created successfully", plan));
});

export const getPlatformPlans = asyncHandler(async (req, res) => {
  const plans = await platformPlanService.getPlatformPlans(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Plans fetched successfully", plans));
});

export const getPlatformPlanById = asyncHandler(async (req, res) => {
  const plan = await platformPlanService.getPlatformPlanById(req.params.planId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan fetched successfully", plan));
});

export const updatePlatformPlan = asyncHandler(async (req, res) => {
  const plan = await platformPlanService.updatePlatformPlan(
    req.params.planId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan updated successfully", plan));
});

export const deletePlatformPlan = asyncHandler(async (req, res) => {
  await platformPlanService.deletePlatformPlan(
    req.params.planId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan deleted successfully"));
});
