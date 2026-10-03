import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformAuthService from "../services/platformAuth.service.js";

import {
  setPlatformAuthCookie,
  clearPlatformAuthCookie,
} from "../../../../utils/platform/platformCookies.js";

export const login = asyncHandler(async (req, res) => {
  const result = await platformAuthService.login(req.body);

  setPlatformAuthCookie(res, result.token);

  return res.status(200).json(
    new ApiResponse(200, "Platform login successful", {
      platformUser: result.platformUser,
      token: result.token,
    }),
  );
});

export const logout = asyncHandler(async (req, res) => {
  clearPlatformAuthCookie(res);

  return res
    .status(200)
    .json(new ApiResponse(200, "Platform logout successful"));
});

export const me = asyncHandler(async (req, res) => {
  const platformUser = await platformAuthService.getMe(req.platformUser._id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Platform user fetched successfully", platformUser),
    );
});
