import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import authService from "../services/auth.service.js";

import { setAuthCookie, clearAuthCookie } from "../../../../utils/cookies.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  setAuthCookie(res, result.token);

  return res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      user: result.user,
      token: result.token,
    }),
  );
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  setAuthCookie(res, result.token);

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      user: result.user,
      token: result.token,
    }),
  );
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json(new ApiResponse(200, "Logout successful"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, "If account exists, reset link has been sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, "Password reset successful"));
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword({
    userId: req.user._id,
    oldPassword: req.body.oldPassword,
    newPassword: req.body.newPassword,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
});
