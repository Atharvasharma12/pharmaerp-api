import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import marketplacePricingService from "../services/marketplacePricing.service.js";

export const getMyStorePricing = asyncHandler(async (req, res) => {
  const pricingList = await marketplacePricingService.getMyStorePricing(req.user);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Your store pricing fetched successfully", pricingList),
    );
});

export const getMyProductPricing = asyncHandler(async (req, res) => {
  const pricing = await marketplacePricingService.getMyProductPricing(
    req.params.globalProductId,
    req.user,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Product pricing fetched successfully", pricing),
    );
});

export const getAvailablePricingCatalog = asyncHandler(async (req, res) => {
  const result = await marketplacePricingService.getAvailablePricingCatalog(
    req.user,
    req.query,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Platform pricing catalog fetched successfully",
        result,
      ),
    );
});
