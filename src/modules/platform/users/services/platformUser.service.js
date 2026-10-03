import ApiError from "../../../../utils/ApiError.js";

import platformUserRepository from "../repositories/platformUser.repository.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

const createPlatformUser = async (payload, currentPlatformUser) => {
  const existingPlatformUser =
    await platformUserRepository.findPlatformUserByEmail(payload.email);

  if (existingPlatformUser) {
    throw new ApiError(400, "Platform user email already exists");
  }

  if (
    currentPlatformUser.role !== PLATFORM_ROLES.SUPER_ADMIN &&
    payload.role === PLATFORM_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "Only super admin can create super admin");
  }

  const platformUser = await platformUserRepository.createPlatformUser({
    ...payload,
    createdBy: currentPlatformUser._id,
  });

  return platformUser.toSafeObject();
};

const getPlatformUsers = async (query = {}) => {
  const result = await platformUserRepository.getPlatformUsers(query);

  return {
    users: result.users.map((user) => user.toSafeObject()),

    pagination: result.pagination,
  };
};

const getPlatformUserById = async (platformUserId) => {
  const platformUser =
    await platformUserRepository.findPlatformUserById(platformUserId);

  if (!platformUser) {
    throw new ApiError(404, "Platform user not found");
  }

  return platformUser.toSafeObject();
};

const updatePlatformUser = async (
  platformUserId,
  payload,
  currentPlatformUser,
) => {
  const platformUser =
    await platformUserRepository.findPlatformUserById(platformUserId);

  if (!platformUser) {
    throw new ApiError(404, "Platform user not found");
  }

  if (
    currentPlatformUser.role !== PLATFORM_ROLES.SUPER_ADMIN &&
    platformUser.role === PLATFORM_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "Only super admin can update super admin");
  }

  if (payload.email && payload.email !== platformUser.email) {
    const existingPlatformUser =
      await platformUserRepository.findPlatformUserByEmail(payload.email);

    if (
      existingPlatformUser &&
      existingPlatformUser._id.toString() !== platformUser._id.toString()
    ) {
      throw new ApiError(400, "Platform user email already exists");
    }
  }

  Object.keys(payload).forEach((key) => {
    platformUser[key] = payload[key];
  });

  await platformUserRepository.savePlatformUser(platformUser);

  return platformUser.toSafeObject();
};

const deletePlatformUser = async (platformUserId, currentPlatformUser) => {
  const platformUser =
    await platformUserRepository.findPlatformUserById(platformUserId);

  if (!platformUser) {
    throw new ApiError(404, "Platform user not found");
  }

  if (platformUser._id.toString() === currentPlatformUser._id.toString()) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  if (
    currentPlatformUser.role !== PLATFORM_ROLES.SUPER_ADMIN &&
    platformUser.role === PLATFORM_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "Only super admin can delete super admin");
  }

  await platformUserRepository.deletePlatformUserById(platformUserId);

  return {
    success: true,
  };
};

export default {
  createPlatformUser,
  getPlatformUsers,
  getPlatformUserById,
  updatePlatformUser,
  deletePlatformUser,
};
