import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import cashExchangeService from "../services/cashExchange.service.js";

export const createCashExchange = asyncHandler(async (req, res) => {
  const cashExchange = await cashExchangeService.createCashExchange(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(
      new ApiResponse(201, "Cash Exchange completed successfully", cashExchange),
    );
});

export const getCashExchanges = asyncHandler(async (req, res) => {
  const result = await cashExchangeService.getCashExchanges(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Exchanges fetched successfully", result));
});

export const getCashExchangeById = asyncHandler(async (req, res) => {
  const cashExchange = await cashExchangeService.getCashExchangeById(
    req.params.cashExchangeId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Cash Exchange fetched successfully", cashExchange),
    );
});

export const cancelCashExchange = asyncHandler(async (req, res) => {
  const cashExchange = await cashExchangeService.cancelCashExchange(
    req.params.cashExchangeId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Cash Exchange cancelled successfully", cashExchange),
    );
});
