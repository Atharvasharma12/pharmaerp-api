import crypto from "crypto";

import ApiError from "../../../../utils/ApiError.js";

import authRepository from "../repositories/auth.repository.js";

import {
  generateAccessToken,
  buildAuthPayload,
} from "../../../../utils/jwt.js";

const register = async (payload) => {
  const { username, email, password, fullName, phone } = payload;

  const existingEmail = await authRepository.findUserByEmail(email);

  if (existingEmail) {
    throw new ApiError(400, "Email already exists");
  }

  const existingUsername = await authRepository.findUserByUsername(username);

  if (existingUsername) {
    throw new ApiError(400, "Username already exists");
  }

  const user = await authRepository.createUser({
    username,
    email,
    password,
    fullName,
    phone,
  });

  const token = generateAccessToken(
    buildAuthPayload({
      userId: user._id,
    }),
  );

  return {
    user: user.toSafeObject(),
    token,
  };
};

const login = async ({ identifier, password }) => {
  const user = await authRepository.findUserByEmailOrUsername(identifier, {
    select: "+password",
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is disabled");
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.lastLoginAt = new Date();

  await authRepository.saveUser(user);

  const token = generateAccessToken(
    buildAuthPayload({
      userId: user._id,
    }),
  );

  return {
    user: user.toSafeObject(),
    token,
  };
};

const forgotPassword = async ({ email }) => {
  const user = await authRepository.findUserByEmail(email);

  if (!user || !user.isActive) {
    return {
      success: true,
    };
  }

  const resetToken = user.createPasswordResetToken();

  await authRepository.saveUser(user);

  return {
    success: true,
    resetToken,
  };
};

const resetPassword = async ({ token, password }) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await authRepository.findUserByResetToken(tokenHash);

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = password;

  user.clearPasswordResetToken();

  await authRepository.saveUser(user);

  return {
    success: true,
  };
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await authRepository.findUserById(userId, {
    select: "+password",
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordMatched = await user.comparePassword(oldPassword);

  if (!isPasswordMatched) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;

  await authRepository.saveUser(user);

  return {
    success: true,
  };
};

export default {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
};
