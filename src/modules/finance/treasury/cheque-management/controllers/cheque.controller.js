import asyncHandler from "../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../utils/ApiResponse.js";
import chequeService from "../services/cheque.service.js";

export const createCheque = asyncHandler(async (req, res) => {
  const cheque = await chequeService.createCheque(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Cheque created successfully", cheque));
});

export const getCheques = asyncHandler(async (req, res) => {
  const result = await chequeService.getCheques(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheques fetched successfully", result));
});

export const getChequeById = asyncHandler(async (req, res) => {
  const cheque = await chequeService.getChequeById(
    req.params.chequeId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheque fetched successfully", cheque));
});

export const depositCheque = asyncHandler(async (req, res) => {
  const cheque = await chequeService.depositCheque(
    req.params.chequeId,
    req.companyId,
    req.workspaceId,
    req.user._id,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheque marked as deposited", cheque));
});

export const clearCheque = asyncHandler(async (req, res) => {
  const cheque = await chequeService.clearCheque(
    req.params.chequeId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheque cleared successfully", cheque));
});

export const bounceCheque = asyncHandler(async (req, res) => {
  const cheque = await chequeService.bounceCheque(
    req.params.chequeId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheque marked as bounced", cheque));
});

export const cancelCheque = asyncHandler(async (req, res) => {
  const cheque = await chequeService.cancelCheque(
    req.params.chequeId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cheque cancelled successfully", cheque));
});
