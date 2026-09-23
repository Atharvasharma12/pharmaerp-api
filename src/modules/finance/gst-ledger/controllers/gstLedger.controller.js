import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import gstLedgerService from "../services/gstLedger.service.js";

export const getGstr1Ledger = asyncHandler(async (req, res) => {
  const result = await gstLedgerService.getGstr1Ledger(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "GSTR-1 ledger entries fetched successfully", result));
});

export const getGstr2Ledger = asyncHandler(async (req, res) => {
  const result = await gstLedgerService.getGstr2Ledger(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "GSTR-2 ledger entries fetched successfully", result));
});

export const createGstr1Ledger = asyncHandler(async (req, res) => {
  const result = await gstLedgerService.createGstr1Entry(
    req.workspaceId,
    req.companyId,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "GSTR-1 ledger entry created successfully", result));
});

export const createGstr2Ledger = asyncHandler(async (req, res) => {
  const result = await gstLedgerService.createGstr2Entry(
    req.workspaceId,
    req.companyId,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "GSTR-2 ledger entry created successfully", result));
});
