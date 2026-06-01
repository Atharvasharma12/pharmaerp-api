import ApiError from "../../../../utils/ApiError.js";

import branchRepository from "../repositories/branch.repository.js";
import companyRepository from "../../companies/repositories/company.repository.js";
import workspaceRepository from "../../workspaces/repositories/workspace.repository.js";

import { BRANCH_STATUS } from "../constants/branch.constant.js";

import { COMPANY_STATUS } from "../../companies/constants/company.constant.js";

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

const ensureCompanyAccess = async (companyId, workspaceId) => {
  const company = await companyRepository.findCompanyByIdAndWorkspace(
    companyId,
    workspaceId,
  );

  if (!company || company.status === COMPANY_STATUS.DELETED) {
    throw new ApiError(404, "Company not found");
  }

  if (company.status !== COMPANY_STATUS.ACTIVE) {
    throw new ApiError(403, "Company is not active");
  }

  return company;
};

const createBranch = async (workspaceId, companyId, userId, payload) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  await ensureCompanyAccess(companyId, workspaceId);

  const slug = createSlug(payload.name);

  const existingBranch = await branchRepository.findBranchBySlug(
    workspaceId,
    companyId,
    slug,
  );

  if (existingBranch) {
    throw new ApiError(400, "Branch with this name already exists");
  }

  if (payload.isPrimary) {
    const primaryBranch = await branchRepository.getPrimaryBranch(companyId);

    if (primaryBranch) {
      throw new ApiError(400, "Primary branch already exists");
    }
  }

  const branch = await branchRepository.createBranch({
    workspaceId,
    companyId,

    name: payload.name,
    slug,

    type: payload.type,

    email: payload.email,
    phone: payload.phone,

    address: payload.address,
    logo: payload.logo,

    contactPerson: payload.contactPerson,

    gstin: payload.gstin,
    drugLicenseNumber: payload.drugLicenseNumber,

    billingSettings: payload.billingSettings,
    inventorySettings: payload.inventorySettings,
    settings: payload.settings,

    isPrimary: payload.isPrimary || false,

    createdBy: userId,
  });

  return branch.toSafeObject();
};

const getCompanyBranches = async (companyId, workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  await ensureCompanyAccess(companyId, workspaceId);

  const branches = await branchRepository.getCompanyBranches(companyId);

  return branches.map((branch) => branch.toSafeObject());
};

const getBranchById = async (branchId, companyId, workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  await ensureCompanyAccess(companyId, workspaceId);

  const branch = await branchRepository.findBranchByIdAndCompany(
    branchId,
    companyId,
  );

  if (!branch || branch.workspaceId.toString() !== workspaceId.toString()) {
    throw new ApiError(404, "Branch not found");
  }

  return branch.toSafeObject();
};

const updateBranch = async (
  branchId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  await ensureCompanyAccess(companyId, workspaceId);

  const branch = await branchRepository.findBranchByIdAndCompany(
    branchId,
    companyId,
  );

  if (!branch || branch.workspaceId.toString() !== workspaceId.toString()) {
    throw new ApiError(404, "Branch not found");
  }

  if (payload.name && payload.name !== branch.name) {
    const slug = createSlug(payload.name);

    const existingBranch = await branchRepository.findBranchBySlug(
      workspaceId,
      companyId,
      slug,
    );

    if (
      existingBranch &&
      existingBranch._id.toString() !== branch._id.toString()
    ) {
      throw new ApiError(400, "Branch with this name already exists");
    }

    branch.slug = slug;
  }

  if (payload.isPrimary === true && branch.isPrimary === false) {
    const existingPrimary = await branchRepository.getPrimaryBranch(companyId);

    if (
      existingPrimary &&
      existingPrimary._id.toString() !== branch._id.toString()
    ) {
      throw new ApiError(400, "Another primary branch already exists");
    }
  }

  const allowedFields = [
    "name",
    "type",
    "email",
    "phone",
    "address",
    "logo",
    "contactPerson",
    "gstin",
    "drugLicenseNumber",
    "billingSettings",
    "inventorySettings",
    "settings",
    "status",
    "isPrimary",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      branch[field] = payload[field];
    }
  });

  await branchRepository.saveBranch(branch);

  return branch.toSafeObject();
};

const deleteBranch = async (branchId, companyId, workspaceId, userId) => {
  const { member } = await ensureWorkspaceAccess(workspaceId, userId);

  await ensureCompanyAccess(companyId, workspaceId);

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can delete branch");
  }

  const branch = await branchRepository.findBranchByIdAndCompany(
    branchId,
    companyId,
  );

  if (!branch || branch.workspaceId.toString() !== workspaceId.toString()) {
    throw new ApiError(404, "Branch not found");
  }

  if (branch.status === BRANCH_STATUS.DELETED || branch.isDeleted) {
    throw new ApiError(404, "Branch not found");
  }

  if (branch.isPrimary) {
    throw new ApiError(400, "Primary branch cannot be deleted");
  }

  const deletedBranch = await branchRepository.deleteBranchById(
    branch._id,
    companyId,
    workspaceId,
    userId,
  );

  if (!deletedBranch) {
    throw new ApiError(404, "Branch not found");
  }

  return {
    success: true,
  };
};

export default {
  createBranch,
  getCompanyBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};
