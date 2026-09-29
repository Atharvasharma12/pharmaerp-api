import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import purchaseBillService from "../services/purchaseBill.service.js";

export const createPurchaseBill = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (!payload.branchId && req.headers["x-branch-id"]) {
    payload.branchId = req.headers["x-branch-id"];
  }

  const bill = await purchaseBillService.createPurchaseBill(
    req.workspaceId,
    req.companyId,
    req.user._id,
    payload
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Purchase bill created successfully", bill));
});

export const updatePurchaseBill = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (!payload.branchId && req.headers["x-branch-id"]) {
    payload.branchId = req.headers["x-branch-id"];
  }

  const bill = await purchaseBillService.updatePurchaseBill(
    req.params.billId,
    req.workspaceId,
    req.companyId,
    req.user._id,
    payload
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Purchase bill updated successfully", bill));
});

export const getPurchaseBills = asyncHandler(async (req, res) => {
  const result = await purchaseBillService.getPurchaseBills(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Purchase bills fetched successfully", result)
    );
});

export const getPurchaseBillById = asyncHandler(async (req, res) => {
  const bill = await purchaseBillService.getPurchaseBillById(
    req.params.billId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Purchase bill fetched successfully", bill));
});

export const ingestPurchaseBill = asyncHandler(async (req, res) => {
  let branchId = req.headers["x-branch-id"] || req.body.branchId || null;

  console.log(`[Controller] Ingesting Purchase Bill ID: ${req.params.billId}`);

  const bill = await purchaseBillService.ingestPurchaseBill(
    req.params.billId,
    req.workspaceId,
    req.companyId,
    branchId,
    req.user._id
  );

  console.log(`[Controller] Successfully ingested bill: ${bill.purchaseBillNo}`);

  return res
    .status(200)
    .json(new ApiResponse(200, "Stock ingested successfully", bill));
});

export const getPurchaseHistory = asyncHandler(async (req, res) => {
  const history = await purchaseBillService.getPurchaseHistory(
    req.params.productId,
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Product purchase history fetched successfully", history));
});
