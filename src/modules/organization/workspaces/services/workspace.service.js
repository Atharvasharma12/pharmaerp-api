import ApiError from "../../../../utils/ApiError.js";

import workspaceRepository from "../repositories/workspace.repository.js";

import {
  WORKSPACE_STATUS,
  WORKSPACE_MEMBER_STATUS,
} from "../constants/workspace.constant.js";

const createSlug = (name) => {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const createWorkspace = async (userId, payload) => {
  const { name, type, email, phone, address, logo, settings } = payload;

  const slug = createSlug(name);

  const existingWorkspace = await workspaceRepository.findWorkspaceBySlug(slug);

  if (existingWorkspace) {
    throw new ApiError(400, "Workspace with this name already exists");
  }

  const workspace = await workspaceRepository.createWorkspace({
    name,
    slug,
    type,
    ownerId: userId,
    email,
    phone,
    address,
    logo,
    settings,
  });

  await workspaceRepository.createWorkspaceMember({
    workspaceId: workspace._id,
    userId,
    createdBy: userId,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    isOwner: true,
    isPrimary: true,
  });

  return workspace.toSafeObject();
};

const getMyWorkspaces = async (userId) => {
  const members = await workspaceRepository.getUserWorkspaceMembers(userId);

  return members.map((member) => ({
    member: member.toSafeObject(),
    workspace: member.workspaceId?.toSafeObject
      ? member.workspaceId.toSafeObject()
      : member.workspaceId,
  }));
};

const getWorkspaceById = async (workspaceId, userId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace || workspace.status === WORKSPACE_STATUS.DELETED) {
    throw new ApiError(404, "Workspace not found");
  }

  return workspace.toSafeObject();
};

const updateWorkspace = async (workspaceId, userId, payload) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can update workspace");
  }

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const allowedFields = [
    "name",
    "type",
    "email",
    "phone",
    "address",
    "logo",
    "settings",
  ];

  if (payload.name && payload.name !== workspace.name) {
    const slug = createSlug(payload.name);

    const existingWorkspace =
      await workspaceRepository.findWorkspaceBySlug(slug);

    if (
      existingWorkspace &&
      existingWorkspace._id.toString() !== workspace._id.toString()
    ) {
      throw new ApiError(400, "Workspace with this name already exists");
    }

    workspace.slug = slug;
  }

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      workspace[field] = payload[field];
    }
  });

  await workspaceRepository.saveWorkspace(workspace);

  return workspace.toSafeObject();
};

const deleteWorkspace = async (workspaceId, userId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can delete workspace");
  }

  const workspace = await workspaceRepository.deleteWorkspaceById(
    workspaceId,
    userId,
  );

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  return {
    success: true,
  };
};

const getWorkspaceMembers = async (workspaceId, userId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member || member.status !== WORKSPACE_MEMBER_STATUS.ACTIVE) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  const members = await workspaceRepository.getWorkspaceMembers(workspaceId);

  return members.map((workspaceMember) => workspaceMember.toSafeObject());
};

const addWorkspaceMember = async (workspaceId, userId, payload) => {
  const currentMember = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (
    !currentMember ||
    currentMember.status !== WORKSPACE_MEMBER_STATUS.ACTIVE
  ) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!currentMember.isOwner) {
    throw new ApiError(403, "Only workspace owner can add members");
  }

  const existingMember = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    payload.userId,
  );

  if (existingMember) {
    throw new ApiError(400, "User is already a member of this workspace");
  }

  const member = await workspaceRepository.createWorkspaceMember({
    workspaceId,
    userId: payload.userId,
    createdBy: userId,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    isOwner: false,
    isPrimary: false,
    notes: payload.notes,
  });

  return member.toSafeObject();
};

const updateWorkspaceMemberStatus = async (
  workspaceId,
  userId,
  memberUserId,
  status,
) => {
  const currentMember = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (
    !currentMember ||
    currentMember.status !== WORKSPACE_MEMBER_STATUS.ACTIVE
  ) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!currentMember.isOwner) {
    throw new ApiError(403, "Only workspace owner can update members");
  }

  if (userId.toString() === memberUserId.toString()) {
    throw new ApiError(400, "You cannot update your own member status");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    memberUserId,
  );

  if (!member) {
    throw new ApiError(404, "Workspace member not found");
  }

  if (member.isOwner) {
    throw new ApiError(400, "Workspace owner status cannot be changed");
  }

  member.status = status;

  await workspaceRepository.saveWorkspaceMember(member);

  return member.toSafeObject();
};

const removeWorkspaceMember = async (workspaceId, userId, memberUserId) => {
  const currentMember = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (
    !currentMember ||
    currentMember.status !== WORKSPACE_MEMBER_STATUS.ACTIVE
  ) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!currentMember.isOwner) {
    throw new ApiError(403, "Only workspace owner can remove members");
  }

  if (userId.toString() === memberUserId.toString()) {
    throw new ApiError(400, "Workspace owner cannot remove themselves");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    memberUserId,
  );

  if (!member) {
    throw new ApiError(404, "Workspace member not found");
  }

  if (member.isOwner) {
    throw new ApiError(400, "Workspace owner cannot be removed");
  }

  const removedMember = await workspaceRepository.removeWorkspaceMember(
    workspaceId,
    memberUserId,
    userId,
  );

  return removedMember.toSafeObject();
};

export default {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberStatus,
  removeWorkspaceMember,
};
