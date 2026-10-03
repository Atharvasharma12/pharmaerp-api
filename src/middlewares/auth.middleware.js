import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";

import authRepository from "../modules/core/auth/repositories/auth.repository.js";

const getTokenFromRequest = (req) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  return token;
};

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    throw new ApiError(401, "Authentication token missing");
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (!decoded?.userId) {
    throw new ApiError(401, "Invalid token payload");
  }

  const user = await authRepository.findUserById(decoded.userId);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is disabled");
  }

  req.user = user;
  req.userId = user._id.toString();

  req.workspaceId = decoded.workspaceId || null;
  req.organizationId = decoded.organizationId || null;
  req.facilityId = decoded.facilityId || null;

  next();
});

export default authMiddleware;
