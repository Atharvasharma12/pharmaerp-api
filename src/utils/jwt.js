import jwt from "jsonwebtoken";
import env from "../config/env.js";

export const generateAccessToken = (payload = {}) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const buildAuthPayload = ({
  userId,
  workspaceId = null,
  organizationId = null,
  facilityId = null,
} = {}) => {
  return {
    userId,

    ...(workspaceId && { workspaceId }),
    ...(organizationId && { organizationId }),
    ...(facilityId && { facilityId }),
  };
};
