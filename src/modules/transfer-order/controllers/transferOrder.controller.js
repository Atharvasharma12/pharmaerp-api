import asyncHandler from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import transferOrderService from "../services/transferOrder.service.js";

export const createTransferOrder = asyncHandler(async (req, res) => {
  const transferOrder = await transferOrderService.createTransferOrder(
    req.workspaceId,
    req.body,
    req.user
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Transfer order created successfully", transferOrder)
    );
});

export const receiveTransferOrder = asyncHandler(async (req, res) => {
  const transferOrder = await transferOrderService.receiveTransferOrder(
    req.workspaceId,
    req.params.id,
    req.user
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Transfer order received successfully", transferOrder)
    );
});

export const getTransferOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, sourceBranchId, destinationBranchId } = req.query;

  const result = await transferOrderService.getTransferOrders(
    req.workspaceId,
    { status, sourceBranchId, destinationBranchId },
    { page: Number(page), limit: Number(limit) }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Transfer orders fetched successfully", result)
    );
});

export const getTransferOrderById = asyncHandler(async (req, res) => {
  const transferOrder = await transferOrderService.getTransferOrderById(
    req.workspaceId,
    req.params.id
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Transfer order fetched successfully", transferOrder)
    );
});
