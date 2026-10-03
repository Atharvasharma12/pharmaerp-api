import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformMarketplaceStoreService from "../services/platformMarketplaceStore.service.js";

export const getAllStores = asyncHandler(async (req, res) => {
  const result = await platformMarketplaceStoreService.getAllStores(req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace stores fetched successfully", result),
    );
});

export const getStoreById = asyncHandler(async (req, res) => {
  const store = await platformMarketplaceStoreService.getStoreById(
    req.params.storeId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace store fetched successfully", store),
    );
});

export const setOnlineStatus = asyncHandler(async (req, res) => {
  const store = await platformMarketplaceStoreService.setOnlineStatus(
    req.params.storeId,
    req.body.onlineStatus,
    req.platformUser,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Store online status updated successfully", store),
    );
});

export const closeStore = asyncHandler(async (req, res) => {
  await platformMarketplaceStoreService.closeStore(
    req.params.storeId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store closed successfully"));
});

export const getStoreStats = asyncHandler(async (req, res) => {
  const stats = await platformMarketplaceStoreService.getStoreStats();

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Store statistics fetched successfully", stats),
    );
});

export const setPlatformOwned = asyncHandler(async (req, res) => {
  const store = await platformMarketplaceStoreService.setPlatformOwned(
    req.params.storeId,
    req.body.isPlatformOwned,
    req.platformUser,
  );

  const message = store.isPlatformOwned
    ? "Store marked as Pahuch-owned successfully"
    : "Store unmarked as Pahuch-owned successfully";

  return res.status(200).json(new ApiResponse(200, message, store));
});
