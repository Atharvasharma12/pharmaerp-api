import ApiError from "../../../../utils/ApiError.js";
import accountGroupRepository from "../repositories/accountGroup.repository.js";
import { ACCOUNT_GROUP_STATUS } from "../constants/accountGroup.constant.js";
import AccountGroup from "../models/accountGroup.model.js";

const isDescendant = async (companyId, parentGroupId, childGroupId) => {
  let current = parentGroupId;
  while (current) {
    if (current.toString() === childGroupId.toString()) {
      return true;
    }
    const parentNode = await accountGroupRepository.findGroupById(current);
    current = parentNode ? parentNode.parentGroupId : null;
  }
  return false;
};

const createAccountGroup = async (workspaceId, companyId, userId, payload) => {
  const {
    groupCode,
    groupName,
    parentGroupId,
    nature,
    description,
    status,
  } = payload;

  // Check unique code
  const existingCode = await accountGroupRepository.findGroupByCode(companyId, groupCode);
  if (existingCode) {
    throw new ApiError(400, "Group with this code already exists in the company");
  }

  // Check unique name
  const existingName = await accountGroupRepository.findGroupByName(companyId, groupName);
  if (existingName) {
    throw new ApiError(400, "Group with this name already exists in the company");
  }

  // Validate parent group
  if (parentGroupId) {
    const parent = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
      parentGroupId,
      companyId,
      workspaceId
    );
    if (!parent) {
      throw new ApiError(404, "Parent group not found under this company");
    }
    if (parent.nature !== nature) {
      throw new ApiError(
        400,
        `Child group nature must match parent group nature (${parent.nature})`
      );
    }
  }

  const group = await accountGroupRepository.createGroup({
    workspaceId,
    companyId,
    groupCode,
    groupName,
    parentGroupId: parentGroupId || null,
    nature,
    description,
    status,
    isSystemGroup: false,
    createdBy: userId,
  });

  return group.toSafeObject();
};

const getAccountGroups = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await accountGroupRepository.getGroups(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    groups: result.groups.map((g) => g.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getAccountGroupById = async (groupId, companyId, workspaceId) => {
  const group = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
    groupId,
    companyId,
    workspaceId
  );

  if (!group) {
    throw new ApiError(404, "Account Group not found");
  }

  return group.toSafeObject();
};

const updateAccountGroup = async (groupId, companyId, workspaceId, userId, payload) => {
  const group = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
    groupId,
    companyId,
    workspaceId
  );

  if (!group) {
    throw new ApiError(404, "Account Group not found");
  }

  if (group.isSystemGroup) {
    throw new ApiError(400, "System groups cannot be modified");
  }

  // Code or Name change checks
  if (payload.groupName && payload.groupName !== group.groupName) {
    const existingName = await accountGroupRepository.findGroupByName(companyId, payload.groupName);
    if (existingName && existingName._id.toString() !== group._id.toString()) {
      throw new ApiError(400, "Group with this name already exists in the company");
    }
  }

  // Parent Group change checks
  if (payload.parentGroupId) {
    if (payload.parentGroupId === groupId) {
      throw new ApiError(400, "A group cannot be its own parent");
    }

    const parent = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
      payload.parentGroupId,
      companyId,
      workspaceId
    );
    if (!parent) {
      throw new ApiError(404, "Parent group not found under this company");
    }

    if (parent.nature !== group.nature) {
      throw new ApiError(
        400,
        `Group nature must match parent group nature (${parent.nature})`
      );
    }

    // Circular dependency check
    const isCircular = await isDescendant(companyId, payload.parentGroupId, groupId);
    if (isCircular) {
      throw new ApiError(400, "Nesting parent group under this group creates circular nesting");
    }
  }

  const allowedFields = [
    "groupName",
    "parentGroupId",
    "description",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      group[field] = payload[field];
    }
  });

  await accountGroupRepository.saveGroup(group);

  return group.toSafeObject();
};

const deleteAccountGroup = async (groupId, companyId, workspaceId, userId) => {
  const group = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
    groupId,
    companyId,
    workspaceId
  );

  if (!group) {
    throw new ApiError(404, "Account Group not found");
  }

  if (group.isSystemGroup) {
    throw new ApiError(400, "System groups cannot be deleted");
  }

  // Check if group contains subgroups
  const hasChildren = await AccountGroup.exists({
    parentGroupId: groupId,
    companyId,
    workspaceId,
    isDeleted: false,
  });

  if (hasChildren) {
    throw new ApiError(400, "Cannot delete group that contains active subgroups");
  }

  await accountGroupRepository.deleteGroupById(groupId, companyId, workspaceId, userId);

  return { success: true };
};

export default {
  createAccountGroup,
  getAccountGroups,
  getAccountGroupById,
  updateAccountGroup,
  deleteAccountGroup,
};
