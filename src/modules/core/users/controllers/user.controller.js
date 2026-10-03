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

export const updateMyEmail = asyncHandler(async (req, res) => {
  const user = await userService.updateMyEmail(req.user._id, req.body.email);

  return res
    .status(200)
    .json(new ApiResponse(200, "Email updated successfully", user));
});

export const updateMyPhone = asyncHandler(async (req, res) => {
  const user = await userService.updateMyPhone(req.user._id, req.body.phone);

  return res
    .status(200)
    .json(new ApiResponse(200, "Phone updated successfully", user));
});

export const getMyActiveContext = asyncHandler(async (req, res) => {
  const activeContext = await userService.getMyActiveContext(req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Active context fetched successfully",
        activeContext,
      ),
    );
});

export const updateMyActiveContext = asyncHandler(async (req, res) => {
  const user = await userService.updateMyActiveContext(req.user._id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, "Active context updated successfully", user));
});

export const deleteMyAccount = asyncHandler(async (req, res) => {
  await userService.deleteMyAccount(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Account deleted successfully"));
});
