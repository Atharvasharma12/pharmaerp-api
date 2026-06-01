import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import companyRepository from "../modules/organization/companies/repositories/company.repository.js";

import { COMPANY_STATUS } from "../modules/organization/companies/constants/company.constant.js";

const getCompanyIdFromRequest = (req) => {
  return (
    req.headers["x-company-id"] ||
    req.params.companyId ||
    req.query.companyId ||
    req.body.companyId ||
    null
  );
};

const companyContextMiddleware = asyncHandler(async (req, res, next) => {
  const companyId = getCompanyIdFromRequest(req);

  if (!companyId) {
    throw new ApiError(400, "Company id is required");
  }

  if (!req.workspaceId) {
    throw new ApiError(400, "Workspace context is required");
  }

  const company = await companyRepository.findCompanyByIdAndWorkspace(
    companyId,
    req.workspaceId,
  );

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.status !== COMPANY_STATUS.ACTIVE) {
    throw new ApiError(403, "Company is not active");
  }

  req.company = company;
  req.companyId = company._id.toString();

  next();
});

export default companyContextMiddleware;
