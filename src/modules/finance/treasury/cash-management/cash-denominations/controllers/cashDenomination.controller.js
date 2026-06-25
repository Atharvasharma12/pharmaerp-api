import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import cashDenominationService from "../services/cashDenomination.service.js";

export const createCashDenomination = asyncHandler(async (req, res) => {
  const cashDenomination = await cashDenominationService.createCashDenomination(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Cash Denomination count created successfully", cashDenomination));
});

export const getCashDenominations = asyncHandler(async (req, res) => {
  const result = await cashDenominationService.getCashDenominations(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Denomination counts fetched successfully", result));
});

export const getCashDenominationById = asyncHandler(async (req, res) => {
  const cashDenomination = await cashDenominationService.getCashDenominationById(
    req.params.cashDenominationId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Denomination count fetched successfully", cashDenomination));
});

export const confirmCashDenomination = asyncHandler(async (req, res) => {
  const cashDenomination = await cashDenominationService.confirmCashDenomination(
    req.params.cashDenominationId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Denomination count confirmed", cashDenomination));
});

export const cancelCashDenomination = asyncHandler(async (req, res) => {
  const cashDenomination = await cashDenominationService.cancelCashDenomination(
    req.params.cashDenominationId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash Denomination count cancelled", cashDenomination));
});
