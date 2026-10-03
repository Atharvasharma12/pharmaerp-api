import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import reportsService from "../services/reports.service.js";

// ── Trial Balance ──────────────────────────────────────────────
export const getTrialBalance = asyncHandler(async (req, res) => {
  const result = await reportsService.getTrialBalance(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Trial balance fetched successfully", result));
});

// ── General Ledger ─────────────────────────────────────────────
export const getGeneralLedger = asyncHandler(async (req, res) => {
  const result = await reportsService.getGeneralLedger(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "General ledger fetched successfully", result));
});

// ── Customer Ledger ────────────────────────────────────────────
export const getCustomerLedger = asyncHandler(async (req, res) => {
  const result = await reportsService.getCustomerLedger(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Customer ledger fetched successfully", result));
});

// ── Supplier Ledger ────────────────────────────────────────────
export const getSupplierLedger = asyncHandler(async (req, res) => {
  const result = await reportsService.getSupplierLedger(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier ledger fetched successfully", result));
});

// ── Cash Book ──────────────────────────────────────────────────
export const getCashBook = asyncHandler(async (req, res) => {
  const result = await reportsService.getCashBook(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Cash book fetched successfully", result));
});

// ── Bank Book ──────────────────────────────────────────────────
export const getBankBook = asyncHandler(async (req, res) => {
  const result = await reportsService.getBankBook(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Bank book fetched successfully", result));
});

// ── Profit & Loss ──────────────────────────────────────────────
export const getProfitLoss = asyncHandler(async (req, res) => {
  const result = await reportsService.getProfitLoss(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Profit & loss statement fetched successfully", result));
});

// ── Balance Sheet ──────────────────────────────────────────────
export const getBalanceSheet = asyncHandler(async (req, res) => {
  const result = await reportsService.getBalanceSheet(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Balance sheet fetched successfully", result));
});

// ── GST Report ─────────────────────────────────────────────────
export const getGstReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getGstReport(
    req.workspaceId,
    req.companyId,
    req.query
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "GST report fetched successfully", result));
});
