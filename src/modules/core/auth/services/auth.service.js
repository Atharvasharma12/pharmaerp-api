import crypto from "crypto";

import ApiError from "../../../../utils/ApiError.js";

import authRepository from "../repositories/auth.repository.js";

import {
  generateAccessToken,
  buildAuthPayload,
} from "../../../../utils/jwt.js";

const hashValue = (value) => {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (payload) => {
  const { email, password, fullName, phone } = payload;

  const existingEmail = await authRepository.findUserByEmail(email);

  if (existingEmail) {
    throw new ApiError(400, "Email already exists");
  }

  const user = await authRepository.createUser({
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

const login = async ({ email, phone, identifier, password }) => {
  const loginInput = identifier || email || phone;

  if (!loginInput) {
    throw new ApiError(400, "Email or phone number is required");
  }

  const user = await authRepository.findUserByIdentifier(loginInput, {
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
  const tokenHash = hashValue(token);

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

const sendEmailOtp = async ({ email }) => {
  const user = await authRepository.findUserByEmail(email, {
    select: "+emailOtpHash +emailOtpExpiresAt",
  });

  if (!user || !user.isActive) {
    return {
      success: true,
    };
  }

  const otp = generateOtp();

  user.emailOtpHash = hashValue(otp);
  user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await authRepository.saveUser(user);

  return {
    success: true,
    otp,
  };
};

const verifyEmailOtp = async ({ email, otp }) => {
  const otpHash = hashValue(otp);

  const user = await authRepository.findUserByEmailOtp(email, otpHash);

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.emailVerified = true;
  user.emailOtpHash = null;
  user.emailOtpExpiresAt = null;

  await authRepository.saveUser(user);

  return {
    success: true,
    user: user.toSafeObject(),
  };
};

export default {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEmailOtp,
  verifyEmailOtp,
};
