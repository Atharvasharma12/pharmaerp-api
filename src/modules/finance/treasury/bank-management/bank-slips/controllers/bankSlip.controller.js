import asyncHandler from "../../../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../../../utils/ApiResponse.js";
import bankSlipService from "../services/bankSlip.service.js";

export const createBankSlip = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.createBankSlip(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body,
  );
  return res
    .status(201)
    .json(new ApiResponse(201, "Bank Slip created successfully", bankSlip));
});

export const getBankSlips = asyncHandler(async (req, res) => {
  const result = await bankSlipService.getBankSlips(
    req.workspaceId,
    req.companyId,
    req.query,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slips fetched successfully", result));
});

export const getBankSlipById = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.getBankSlipById(
    req.params.bankSlipId,
    req.companyId,
    req.workspaceId,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slip fetched successfully", bankSlip));
});

export const submitBankSlip = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.submitBankSlip(
    req.params.bankSlipId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slip submitted successfully", bankSlip));
});

export const confirmBankSlip = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.confirmBankSlip(
    req.params.bankSlipId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slip confirmed and journal posted", bankSlip));
});

export const rejectBankSlip = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.rejectBankSlip(
    req.params.bankSlipId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slip rejected", bankSlip));
});

export const cancelBankSlip = asyncHandler(async (req, res) => {
  const bankSlip = await bankSlipService.cancelBankSlip(
    req.params.bankSlipId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank Slip cancelled", bankSlip));
});
