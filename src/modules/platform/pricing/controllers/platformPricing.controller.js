import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformPricingService from "../services/platformPricing.service.js";

export const setPricing = asyncHandler(async (req, res) => {
  const pricing = await platformPricingService.setPricing(
    req.body,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Pricing set successfully", pricing));
});

export const getAllPricing = asyncHandler(async (req, res) => {
  const pricingList = await platformPricingService.getAllPricing(req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "All pricing records fetched successfully", pricingList),
    );
});

export const getPricingById = asyncHandler(async (req, res) => {
  const pricing = await platformPricingService.getPricingById(
    req.params.pricingId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Pricing record fetched successfully", pricing));
});

export const getPricingByGlobalProduct = asyncHandler(async (req, res) => {
  const pricing = await platformPricingService.getPricingByGlobalProduct(
    req.params.globalProductId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Pricing fetched successfully", pricing));
});

export const updatePricingStatus = asyncHandler(async (req, res) => {
  const pricing = await platformPricingService.updatePricingStatus(
    req.params.pricingId,
    req.body.status,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Pricing status updated successfully", pricing));
});

export const deletePricing = asyncHandler(async (req, res) => {
  await platformPricingService.deletePricing(
    req.params.pricingId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Pricing record deleted successfully"));
});
