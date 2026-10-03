import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformMarketplaceSettingsService from "../services/platformMarketplaceSettings.service.js";

export const getMarketplaceSettings = asyncHandler(async (req, res) => {
  const settings =
    await platformMarketplaceSettingsService.getMarketplaceSettings();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace settings fetched successfully", settings),
    );
});

export const updateMarketplaceSettings = asyncHandler(async (req, res) => {
  const settings =
    await platformMarketplaceSettingsService.updateMarketplaceSettings(
      req.body,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace settings updated successfully", settings),
    );
});

export const enableMarketplace = asyncHandler(async (req, res) => {
  const settings = await platformMarketplaceSettingsService.enableMarketplace(
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Marketplace enabled successfully", settings));
});

export const disableMarketplace = asyncHandler(async (req, res) => {
  const settings = await platformMarketplaceSettingsService.disableMarketplace(
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Marketplace disabled successfully", settings));
});
