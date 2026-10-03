import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import planService from "../services/plan.service.js";

// ─── Public / Read ────────────────────────────────────────────────────────────

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

// ─── Admin: Write ─────────────────────────────────────────────────────────────

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await planService.createPlan({
    ...req.body,
    createdBy: req.user?._id || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Plan created successfully", plan));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await planService.updatePlan(req.params.planId, {
    ...req.body,
    updatedBy: req.user?._id || null,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan updated successfully", plan));
});

export const archivePlan = asyncHandler(async (req, res) => {
  const plan = await planService.archivePlan(
    req.params.planId,
    req.user?._id || null,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan archived successfully", plan));
});

export const restorePlan = asyncHandler(async (req, res) => {
  const plan = await planService.restorePlan(
    req.params.planId,
    req.user?._id || null,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan restored successfully", plan));
});

export const deletePlan = asyncHandler(async (req, res) => {
  await planService.deletePlan(req.params.planId, req.user?._id || null);

  return res
    .status(200)
    .json(new ApiResponse(200, "Plan deleted successfully", null));
});
