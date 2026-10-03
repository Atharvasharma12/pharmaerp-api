import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformUserService from "../services/platformUser.service.js";

export const createPlatformUser = asyncHandler(async (req, res) => {
  const platformUser = await platformUserService.createPlatformUser(
    req.body,
    req.platformUser,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Platform user created successfully", platformUser),
    );
});

export const getPlatformUsers = asyncHandler(async (req, res) => {
  const result = await platformUserService.getPlatformUsers(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Platform users fetched successfully", result));
});

export const getPlatformUserById = asyncHandler(async (req, res) => {
  const platformUser = await platformUserService.getPlatformUserById(
    req.params.platformUserId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Platform user fetched successfully", platformUser),
    );
});

export const updatePlatformUser = asyncHandler(async (req, res) => {
  const platformUser = await platformUserService.updatePlatformUser(
    req.params.platformUserId,
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Platform user updated successfully", platformUser),
    );
});

export const deletePlatformUser = asyncHandler(async (req, res) => {
  await platformUserService.deletePlatformUser(
    req.params.platformUserId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Platform user deleted successfully"));
});
