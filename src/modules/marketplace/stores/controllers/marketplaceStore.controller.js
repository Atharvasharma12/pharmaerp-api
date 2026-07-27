import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import marketplaceStoreService from "../services/marketplaceStore.service.js";

export const createMarketplaceStore = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.createMarketplaceStore(
    req.body,
    req.user,
    req.workspaceId,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Marketplace store created successfully", store));
});

export const getMarketplaceStores = asyncHandler(async (req, res) => {
  const stores = await marketplaceStoreService.getMarketplaceStores(
    req.user,
    req.workspaceId,
    req.query,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace stores fetched successfully", stores),
    );
});

export const getMarketplaceStoreById = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.getMarketplaceStoreById(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace store fetched successfully", store),
    );
});

export const updateMarketplaceStore = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.updateMarketplaceStore(
    req.params.storeId,
    req.body,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace store updated successfully", store),
    );
});

export const goOnline = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.goOnline(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store is now online", store));
});

export const goOffline = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.goOffline(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store is now offline", store));
});

export const pauseStore = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.pauseStore(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store paused successfully", store));
});

export const resumeStore = asyncHandler(async (req, res) => {
  const store = await marketplaceStoreService.resumeStore(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Store resumed successfully", store));
});

export const deleteMarketplaceStore = asyncHandler(async (req, res) => {
  await marketplaceStoreService.deleteMarketplaceStore(
    req.params.storeId,
    req.user,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Marketplace store deleted successfully"));
});
