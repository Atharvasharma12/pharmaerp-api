import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import userService from "../services/user.service.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile fetched successfully", user));
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateMyProfile(req.user._id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile updated successfully", user));
});

export const updateMyAvatar = asyncHandler(async (req, res) => {
  const user = await userService.updateMyAvatar(req.user._id, req.body.avatar);

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});

export const removeMyAvatar = asyncHandler(async (req, res) => {
  const user = await userService.removeMyAvatar(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar removed successfully", user));
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Users fetched successfully", result));
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);

  return res
    .status(200)
    .json(new ApiResponse(200, "User fetched successfully", user));
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(
    req.params.userId,
    req.body.isActive,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "User status updated successfully", user));
});
