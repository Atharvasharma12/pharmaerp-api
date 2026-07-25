import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import marketplaceProductService from "../services/marketplaceProduct.service.js";

export const enableProduct = asyncHandler(async (req, res) => {
  const product = await marketplaceProductService.enableProduct(
    req.body,
    req.user,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Product enabled for marketplace successfully", product),
    );
});

export const getEnabledProducts = asyncHandler(async (req, res) => {
  const products = await marketplaceProductService.getEnabledProducts(
    req.user,
    req.query,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace products fetched successfully", products),
    );
});

export const getEnabledProductById = asyncHandler(async (req, res) => {
  const product = await marketplaceProductService.getEnabledProductById(
    req.params.productId,
    req.user,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace product fetched successfully", product),
    );
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await marketplaceProductService.updateProduct(
    req.params.productId,
    req.body,
    req.user,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Marketplace product updated successfully", product),
    );
});

export const disableProduct = asyncHandler(async (req, res) => {
  await marketplaceProductService.disableProduct(
    req.params.productId,
    req.user,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product disabled from marketplace successfully"));
});
