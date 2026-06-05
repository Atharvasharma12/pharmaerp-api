// src/modules/core/access-control/services/role.service.js

import ApiError from "../../../../utils/ApiError.js";

import roleRepository from "../repositories/role.repository.js";
import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_LABELS,
  SYSTEM_ROLE_DESCRIPTIONS,
  ROLE_STATUS,
} from "../constants/role.constant.js";

import {
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from "../constants/permission.constant.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../../../organization/workspaces/constants/workspace.constant.js";

const createCode = (name) => {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
    throw new ApiError(403, "Only workspace owner can manage roles");
  }

  return member;
};

const createDefaultRolesForWorkspace = async (workspaceId, userId) => {
  const createdRoles = [];

  for (const roleCode of Object.values(SYSTEM_ROLES)) {
    const existingRole = await roleRepository.findRoleByCode(
      workspaceId,
      roleCode,
    );

    if (existingRole) {
      createdRoles.push(existingRole);
      continue;
    }

    const role = await roleRepository.createRole({
      workspaceId,
      name: SYSTEM_ROLE_LABELS[roleCode],
      code: roleCode,
      description: SYSTEM_ROLE_DESCRIPTIONS[roleCode],
      permissions: DEFAULT_ROLE_PERMISSIONS[roleCode] || [],
      isSystem: true,
      isEditable: true,
      status: ROLE_STATUS.ACTIVE,
      createdBy: userId,
    });

    createdRoles.push(role);
  }

  return createdRoles.map((role) => role.toSafeObject());
};

const getOwnerRoleForWorkspace = async (workspaceId) => {
  return roleRepository.findRoleByCode(workspaceId, SYSTEM_ROLES.OWNER);
};

const getRoleByCodeForWorkspace = async (workspaceId, code) => {
  return roleRepository.findRoleByCode(workspaceId, code);
};

const createRole = async (workspaceId, userId, payload) => {
  await ensureOwnerAccess(workspaceId, userId);

  const code = payload.code || createCode(payload.name);

  const existingRole = await roleRepository.findRoleByCode(workspaceId, code);

  if (existingRole) {
    throw new ApiError(400, "Role with this code already exists");
  }

  const role = await roleRepository.createRole({
    workspaceId,
    name: payload.name,
    code,
    description: payload.description,
    permissions: payload.permissions || [],
    isSystem: false,
    isEditable: true,
    status: ROLE_STATUS.ACTIVE,
    createdBy: userId,
  });

  return role.toSafeObject();
};

const getWorkspaceRoles = async (workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const roles = await roleRepository.getWorkspaceRoles(workspaceId);

  return roles.map((role) => role.toSafeObject());
};

const getRoleById = async (roleId, workspaceId, userId) => {
  await ensureWorkspaceAccess(workspaceId, userId);

  const role = await roleRepository.findRoleByIdAndWorkspace(
    roleId,
    workspaceId,
  );

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  return role.toSafeObject();
};

const updateRole = async (roleId, workspaceId, userId, payload) => {
  await ensureOwnerAccess(workspaceId, userId);

  const role = await roleRepository.findRoleByIdAndWorkspace(
    roleId,
    workspaceId,
  );

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (!role.isEditable) {
    throw new ApiError(400, "This role cannot be updated");
  }

  const allowedFields = ["name", "description", "permissions", "status"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      role[field] = payload[field];
    }
  });

  await roleRepository.saveRole(role);

  return role.toSafeObject();
};

const deleteRole = async (roleId, workspaceId, userId) => {
  await ensureOwnerAccess(workspaceId, userId);

  const role = await roleRepository.findRoleByIdAndWorkspace(
    roleId,
    workspaceId,
  );

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (role.isSystem) {
    throw new ApiError(400, "System role cannot be deleted");
  }

  const deletedRole = await roleRepository.deleteRoleById(
    roleId,
    workspaceId,
    userId,
  );

  if (!deletedRole) {
    throw new ApiError(404, "Role not found");
  }

  return {
    success: true,
  };
};

const assignRoleToMember = async (
  workspaceId,
  userId,
  memberUserId,
  roleId,
) => {
  await ensureOwnerAccess(workspaceId, userId);

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    memberUserId,
  );

  if (!member) {
    throw new ApiError(404, "Workspace member not found");
  }

  if (member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(400, "Workspace member is not active");
  }

  if (member.isOwner) {
    throw new ApiError(400, "Workspace owner role cannot be changed");
  }

  const role = await roleRepository.findRoleByIdAndWorkspace(
    roleId,
    workspaceId,
  );

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (role.status !== ROLE_STATUS.ACTIVE) {
    throw new ApiError(400, "Role is not active");
  }

  member.roleId = role._id;

  await workspaceRepository.saveWorkspaceMember(member);

  return member.toSafeObject();
};

const getAvailablePermissions = () => {
  return ALL_PERMISSIONS;
};

export default {
  createDefaultRolesForWorkspace,
  getOwnerRoleForWorkspace,
  getRoleByCodeForWorkspace,

  createRole,
  getWorkspaceRoles,
  getRoleById,
  updateRole,
  deleteRole,

  assignRoleToMember,

  getAvailablePermissions,
};
