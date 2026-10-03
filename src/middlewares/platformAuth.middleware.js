import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import { verifyPlatformAccessToken } from "../utils/platform/platformJwt.js";

import platformAuthRepository from "../modules/platform/auth/repositories/platformAuth.repository.js";

import PLATFORM_USER_STATUS from "../constants/platformStatus.constant.js";

const getPlatformTokenFromRequest = (req) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.cookies?.platform_access_token) {
    token = req.cookies.platform_access_token;
  }

  return token;
};

const platformAuthMiddleware = asyncHandler(async (req, res, next) => {
  const token = getPlatformTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Platform authentication token missing");
  }

  let decoded;

  try {
    decoded = verifyPlatformAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired platform token");
  }

  if (!decoded?.id) {
    throw new ApiError(401, "Invalid platform token payload");
  }

  const platformUser = await platformAuthRepository.findPlatformUserById(
    decoded.id,
  );

  if (!platformUser) {
    throw new ApiError(401, "Platform user not found");
  }

  if (platformUser.status !== PLATFORM_USER_STATUS.ACTIVE) {
    throw new ApiError(403, "Platform account is not active");
  }

  req.platformUser = platformUser;

  req.platformUserId = platformUser._id.toString();

  next();
});

export default platformAuthMiddleware;
