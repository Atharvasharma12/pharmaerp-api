// c:\Users\Intel\Desktop\erp\erp-backend\src\modules\platform\dashboard\controllers\platformDashboard.controller.js

import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import platformDashboardService from "../services/platformDashboard.service.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await platformDashboardService.getDashboardStats();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Platform dashboard stats fetched successfully", stats),
    );
});
