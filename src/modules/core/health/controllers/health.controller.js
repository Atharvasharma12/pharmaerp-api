import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import healthService from "../services/health.service.js";

export const getHealth = asyncHandler(async (req, res) => {
  const data = healthService();

  res.status(200).json(new ApiResponse(200, "Health check successful", data));
});
