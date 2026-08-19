// src/modules/core/access-control/services/memberAccess.service.js

import ApiError from "../../../../utils/ApiError.js";

import memberAccessRepository from "../repositories/memberAccess.repository.js";
import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";
import companyRepository from "../../../organization/companies/repositories/company.repository.js";
import branchRepository from "../../../organization/branches/repositories/branch.repository.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../../../organization/workspaces/constants/workspace.constant.js";

import { COMPANY_STATUS } from "../../../organization/companies/constants/company.constant.js";
import { BRANCH_STATUS } from "../../../organization/branches/constants/branch.constant.js";

const normalizeIds = (ids = []) => {
  if (!ids) return [];

  if (!Array.isArray(ids)) {
    return [ids];
  }

  return ids;
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

const ensureOwnerAccess = async (workspaceId, userId) => {
  const { member } = await ensureWorkspaceAccess(workspaceId, userId);

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can manage member access");
  }

  return member;
};

const validateCompanies = async (workspaceId, companyIds = []) => {
  for (const companyId of companyIds) {
    const company = await companyRepository.findCompanyByIdAndWorkspace(
      companyId,
      workspaceId,
    );

    if (!company || company.status === COMPANY_STATUS.DELETED) {
      throw new ApiError(404, "Company not found");
    }

    if (company.status !== COMPANY_STATUS.ACTIVE) {
      throw new ApiError(400, "Company is not active");
    }
  }
};

const validateBranches = async (workspaceId, branchIds = []) => {
  for (const branchId of branchIds) {
    const branch = await branchRepository.findBranchById(branchId);

    if (!branch || branch.status === BRANCH_STATUS.DELETED) {
      throw new ApiError(404, "Branch not found");
    }

    if (branch.workspaceId.toString() !== workspaceId.toString()) {
      throw new ApiError(403, "Branch does not belong to this workspace");
    }

    if (branch.status !== BRANCH_STATUS.ACTIVE) {
      throw new ApiError(400, "Branch is not active");
    }
  }
};

const createDefaultAccessForMember = async ({
  workspaceId,
  workspaceMemberId,
  userId,
  createdBy,
  accessAllCompanies = true,
  accessAllBranches = true,
  companyIds = [],
  branchIds = [],
  branchAccess = [],
}) => {
  const normalizedBranchIds = normalizeIds(branchIds);
  const normalizedBranchAccess = Array.isArray(branchAccess) ? branchAccess : [];

  // Extract branch IDs from branchAccess if branchIds is empty
  const allBranchIds = normalizedBranchIds.length > 0 
    ? normalizedBranchIds 
    : normalizedBranchAccess.map(ba => ba.branchId).filter(Boolean);

  return memberAccessRepository.upsertMemberAccess({
    workspaceId,
    workspaceMemberId,
    userId,

    accessAllCompanies,
    accessAllBranches,

    companyIds: normalizeIds(companyIds),
    branchIds: allBranchIds,
    branchAccess: normalizedBranchAccess,

    createdBy,
    updatedBy: createdBy,
  });
};

const getMemberAccess = async (workspaceId, userId, memberUserId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    memberUserId,
  );

  if (!member) {
    throw new ApiError(404, "Workspace member not found");
  }

  const access = await memberAccessRepository.findMemberAccessByMemberId(
    member._id,
    {
      populate: "companyIds branchIds branchAccess.branchId branchAccess.roleId",
    },
  );

  if (!access) {
    throw new ApiError(404, "Member access not found");
  }

  return access.toSafeObject();
};

const getWorkspaceMemberAccessList = async (workspaceId, userId) => {
  await ensureOwnerAccess(workspaceId, userId);

  const accessList = await memberAccessRepository.getWorkspaceMemberAccessList(
    workspaceId,
    {
      populate: "workspaceMemberId userId companyIds branchIds branchAccess.branchId branchAccess.roleId",
    },
  );

  return accessList.map((access) => access.toSafeObject());
};

const updateMemberAccess = async (
  workspaceId,
  userId,
  memberUserId,
  payload,
) => {
  await ensureOwnerAccess(workspaceId, userId);

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    memberUserId,
  );

  if (!member) {
    throw new ApiError(404, "Workspace member not found");
  }

  if (member.isOwner) {
    throw new ApiError(400, "Workspace owner already has full access");
  }

  if (member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(400, "Workspace member is not active");
  }

  const accessAllCompanies = payload.accessAllCompanies ?? false;
  const accessAllBranches = payload.accessAllBranches ?? false;

  const companyIds = accessAllCompanies ? [] : normalizeIds(payload.companyIds);
  const branchAccess = Array.isArray(payload.branchAccess) ? payload.branchAccess : [];

  let branchIds = accessAllBranches ? [] : normalizeIds(payload.branchIds);
  if (!accessAllBranches && branchIds.length === 0 && branchAccess.length > 0) {
    branchIds = branchAccess.map(item => item.branchId).filter(Boolean);
  }

  await validateCompanies(workspaceId, companyIds);
  await validateBranches(workspaceId, branchIds);

  const access = await memberAccessRepository.upsertMemberAccess({
    workspaceId,
    workspaceMemberId: member._id,
    userId: member.userId,

    accessAllCompanies,
    accessAllBranches,

    companyIds,
    branchIds,
    branchAccess,

    updatedBy: userId,
    createdBy: userId,
  });

  return access.toSafeObject();
};

const hasCompanyAccess = async (workspaceId, userId, companyId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    return false;
  }

  if (member.isOwner) {
    return true;
  }

  return memberAccessRepository.hasCompanyAccess(
    workspaceId,
    userId,
    companyId,
  );
};

const hasBranchAccess = async (workspaceId, userId, branchId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    return false;
  }

  if (member.isOwner) {
    return true;
  }

  return memberAccessRepository.hasBranchAccess(workspaceId, userId, branchId);
};

export default {
  createDefaultAccessForMember,

  getMemberAccess,
  getWorkspaceMemberAccessList,
  updateMemberAccess,

  hasCompanyAccess,
  hasBranchAccess,
};
