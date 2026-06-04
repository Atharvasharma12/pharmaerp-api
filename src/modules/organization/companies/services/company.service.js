import ApiError from "../../../../utils/ApiError.js";

import companyRepository from "../repositories/company.repository.js";
import workspaceRepository from "../../workspaces/repositories/workspace.repository.js";

import { COMPANY_STATUS } from "../constants/company.constant.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../../workspaces/constants/workspace.constant.js";

const createSlug = (name) => {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const ensureWorkspaceAccess = async (workspaceId, userId) => {
  const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace || workspace.status === WORKSPACE_STATUS.DELETED) {
    throw new ApiError(404, "Workspace not found");
  }

  if (workspace.status !== WORKSPACE_STATUS.ACTIVE) {
    throw new ApiError(403, "Workspace is not active");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  return {
    workspace,
    member,
  };
};

const createCompany = async (workspaceId, userId, payload) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const {
    name,
    type,
    logo,
    email,
    phones,
    website,
    address,
    gstin,
    pan,
    owner,
    pharmacist,
    license,
    taxSettings,
    billingSettings,
    businessSettings,
    settings,
  } = payload;

  const slug = createSlug(name);

  const existingCompany = await companyRepository.findCompanyBySlug(
    workspaceId,
    slug,
  );

  if (existingCompany) {
    throw new ApiError(400, "Company with this name already exists");
  }

  if (gstin) {
    const existingGstinCompany = await companyRepository.findCompanyByGstin(
      workspaceId,
      gstin,
    );

    if (existingGstinCompany) {
      throw new ApiError(400, "Company with this GSTIN already exists");
    }
  }

  const company = await companyRepository.createCompany({
    workspaceId,
    name,
    slug,
    type,
    logo,
    email,
    phones,
    website,
    address,
    gstin,
    pan,
    owner,
    pharmacist,
    license,
    taxSettings,
    billingSettings,
    businessSettings,
    settings,
    createdBy: userId,
  });

  return company.toSafeObject();
};

const getWorkspaceCompanies = async (workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const companies = await companyRepository.getWorkspaceCompanies(workspaceId);

  return companies.map((company) => company.toSafeObject());
};

const getCompanyById = async (companyId, workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const company = await companyRepository.findCompanyByIdAndWorkspace(
    companyId,
    workspaceId,
  );

  if (!company || company.status === COMPANY_STATUS.DELETED) {
    throw new ApiError(404, "Company not found");
  }

  return company.toSafeObject();
};

const updateCompany = async (companyId, workspaceId, userId, payload) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const company = await companyRepository.findCompanyByIdAndWorkspace(
    companyId,
    workspaceId,
  );

  if (!company || company.status === COMPANY_STATUS.DELETED) {
    throw new ApiError(404, "Company not found");
  }

  const allowedFields = [
    "name",
    "type",
    "logo",
    "email",
    "phones",
    "website",
    "address",
    "gstin",
    "pan",
    "owner",
    "pharmacist",
    "license",
    "taxSettings",
    "billingSettings",
    "businessSettings",
    "settings",
    "status",
  ];

  if (payload.name && payload.name !== company.name) {
    const slug = createSlug(payload.name);

    const existingCompany = await companyRepository.findCompanyBySlug(
      workspaceId,
      slug,
    );

    if (
      existingCompany &&
      existingCompany._id.toString() !== company._id.toString()
    ) {
      throw new ApiError(400, "Company with this name already exists");
    }

    company.slug = slug;
  }

  if (payload.gstin && payload.gstin !== company.gstin) {
    const existingGstinCompany = await companyRepository.findCompanyByGstin(
      workspaceId,
      payload.gstin,
    );

    if (
      existingGstinCompany &&
      existingGstinCompany._id.toString() !== company._id.toString()
    ) {
      throw new ApiError(400, "Company with this GSTIN already exists");
    }
  }

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      company[field] = payload[field];
    }
  });

  await companyRepository.saveCompany(company);

  return company.toSafeObject();
};

const deleteCompany = async (companyId, workspaceId, userId) => {
  const { member } = await ensureWorkspaceAccess(workspaceId, userId);

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can delete company");
  }

  const company = await companyRepository.deleteCompanyById(
    companyId,
    workspaceId,
    userId,
  );

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  return {
    success: true,
  };
};

export default {
  createCompany,
  getWorkspaceCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};
