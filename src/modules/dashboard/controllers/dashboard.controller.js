import asyncHandler from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import dashboardService from "../services/dashboard.service.js";

export const getDashboardOverview = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] ||
    req.branchId ||
    req.query.branchId ||
    null;

  const data = await dashboardService.getDashboardOverview({
    workspaceId: req.workspaceId,
    companyId: req.companyId,
    branchId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Dashboard overview fetched successfully", data));
});

export default {
  getDashboardOverview,
};
