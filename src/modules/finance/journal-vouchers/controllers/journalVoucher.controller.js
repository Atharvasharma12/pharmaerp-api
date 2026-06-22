import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import journalVoucherService from "../services/journalVoucher.service.js";

export const createVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.createJournalVoucher(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Journal Voucher created successfully", voucher));
});

export const getVouchers = asyncHandler(async (req, res) => {
  const result = await journalVoucherService.getJournalVouchers(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Vouchers fetched successfully", result));
});

export const getVoucherById = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.getJournalVoucherById(
    req.params.voucherId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher fetched successfully", voucher));
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.updateJournalVoucher(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher updated successfully", voucher));
});

export const postVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.postJournalVoucher(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher posted successfully", voucher));
});

export const cancelVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.cancelJournalVoucher(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher cancelled successfully", voucher));
});

export const submitApproval = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.submitForApproval(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher submitted for approval successfully", voucher));
});

export const approveVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.approveJournalVoucher(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher approved successfully", voucher));
});

export const reverseVoucher = asyncHandler(async (req, res) => {
  const voucher = await journalVoucherService.reverseJournalVoucher(
    req.params.voucherId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Journal Voucher reversed successfully", voucher));
});
