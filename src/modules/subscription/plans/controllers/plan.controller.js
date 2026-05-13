import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import planService from "../services/plan.service.js";

export const getPlans = asyncHandler(async (req, res) => {
  const plans = await planService.getPlans(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Plans fetched successfully", plans));
});

export const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await planService.getActivePlans();

  return res
    .status(200)
    .json(new ApiResponse(200, "Active plans fetched successfully", plans));
});

export const getPlanById = asyncHandler(async (req, res) => {
  const plan = await planService.getPlanById(req.params.planId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan fetched successfully", plan));
});
