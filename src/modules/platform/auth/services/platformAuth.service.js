import ApiError from "../../../../utils/ApiError.js";

import platformAuthRepository from "../repositories/platformAuth.repository.js";

import PLATFORM_USER_STATUS from "../../../../constants/platformStatus.constant.js";

import {
  generatePlatformAccessToken,
  buildPlatformAuthPayload,
} from "../../../../utils/platform/platformJwt.js";

const login = async ({ email, password }) => {
  const platformUser = await platformAuthRepository.findPlatformUserByEmail(
    email,
    {
      select: "+password",
    },
  );

  if (!platformUser) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (platformUser.status !== PLATFORM_USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Platform account is not active");
  }

  const isPasswordMatched = await platformUser.comparePassword(password);

  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid credentials");
  }

  platformUser.lastLoginAt = new Date();

  await platformAuthRepository.savePlatformUser(platformUser);

  const token = generatePlatformAccessToken(
    buildPlatformAuthPayload({
      id: platformUser._id,
      email: platformUser.email,
      role: platformUser.role,
    }),
  );

  return {
    platformUser: platformUser.toSafeObject(),
    token,
  };
};

const getMe = async (platformUserId) => {
  const platformUser =
    await platformAuthRepository.findPlatformUserById(platformUserId);

  if (!platformUser) {
    throw new ApiError(404, "Platform user not found");
  }

  if (platformUser.status !== PLATFORM_USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Platform account is not active");
  }

  return platformUser.toSafeObject();
};

export default {
  login,
  getMe,
};
