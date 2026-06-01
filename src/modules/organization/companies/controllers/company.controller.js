import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import companyService from "../services/company.service.js";

export const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany(
    req.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Company created successfully", company));
});

export const getWorkspaceCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getWorkspaceCompanies(
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Companies fetched successfully", companies));
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(
    req.params.companyId,
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Company fetched successfully", company));
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(
    req.params.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Company updated successfully", company));
});

export const deleteCompany = asyncHandler(async (req, res) => {
  await companyService.deleteCompany(
    req.params.companyId,
    req.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Company deleted successfully"));
});
