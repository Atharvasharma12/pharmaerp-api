import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import branchRepository from "../modules/organization/branches/repositories/branch.repository.js";

import { BRANCH_STATUS } from "../modules/organization/branches/constants/branch.constant.js";

const getBranchIdFromRequest = (req) => {
  return (
    req.headers["x-branch-id"] ||
    req.params.branchId ||
    req.query.branchId ||
    req.body.branchId ||
    null
  );
};

const branchContextMiddleware = asyncHandler(async (req, res, next) => {
  const branchId = getBranchIdFromRequest(req);

  if (!branchId) {
    throw new ApiError(400, "Branch id is required");
  }

  if (!req.workspaceId) {
    throw new ApiError(400, "Workspace context is required");
  }

  if (!req.companyId) {
    throw new ApiError(400, "Company context is required");
  }

  const branch = await branchRepository.findBranchByIdAndCompany(
    branchId,
    req.companyId,
  );

  if (!branch) {
    throw new ApiError(404, "Branch not found");
  }

  if (branch.workspaceId.toString() !== req.workspaceId.toString()) {
    throw new ApiError(403, "Branch does not belong to this workspace");
  }

  if (branch.status !== BRANCH_STATUS.ACTIVE) {
    throw new ApiError(403, "Branch is not active");
  }

  req.branch = branch;
  req.branchId = branch._id.toString();

  next();
});

export default branchContextMiddleware;
