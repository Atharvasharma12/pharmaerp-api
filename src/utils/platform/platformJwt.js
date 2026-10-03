import jwt from "jsonwebtoken";

import env from "../../config/env.js";

export const generatePlatformAccessToken = (payload = {}) => {
  return jwt.sign(payload, env.PLATFORM_JWT_SECRET, {
    expiresIn: env.PLATFORM_JWT_EXPIRES_IN,
  });
};

export const verifyPlatformAccessToken = (token) => {
  return jwt.verify(token, env.PLATFORM_JWT_SECRET);
};

export const buildPlatformAuthPayload = ({ id, email, role } = {}) => {
  return {
    id,
    email,
    role,
    userType: "PLATFORM_USER",
  };
};

export default {
  generatePlatformAccessToken,
  verifyPlatformAccessToken,
  buildPlatformAuthPayload,
};
