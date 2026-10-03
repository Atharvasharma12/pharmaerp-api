import mongoose from "mongoose";
import TransferOrder from "../models/transferOrder.model.js";
import Batch from "../../catalog/products/models/batch.model.js";
import ProductFacility from "../../catalog/products/models/productFacility.model.js";
import ApiError from "../../../utils/ApiError.js";

const generateTransferNo = async () => {
  const count = await TransferOrder.countDocuments();
  return `TR-${String(count + 1).padStart(4, "0")}`;
};

export const createTransferOrder = async (workspaceId, data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { sourceBranchId, destinationBranchId, items, remarks } = data;

    if (!items || items.length === 0) {
      throw new ApiError(400, "Items cannot be empty");
    }

    if (sourceBranchId === destinationBranchId) {
      throw new ApiError(400, "Source and destination branches cannot be the same");
    }

    const transferNo = await generateTransferNo();

    const transferOrder = new TransferOrder({
      workspaceId,
      transferNo,
      sourceBranchId,
      destinationBranchId,
      status: "IN_TRANSIT",
      items,
      remarks,
      createdBy: user._id,
    });

    for (const item of items) {
      const batch = await Batch.findOne({
        _id: item.batch,
        workspaceId,
        branch_id: sourceBranchId,
      }).session(session);

      if (!batch) {
        throw new ApiError(404, `Batch ${item.batchNo} not found in source branch`);
      }

      if (batch.batchQty <= 0) {
        throw new ApiError(400, `Cannot transfer from empty batch ${item.batchNo}`);
      }

      if (batch.batchQty < item.transferQty) {
        throw new ApiError(400, `Insufficient quantity in batch ${item.batchNo}`);
      }

      // Deduct from source batch
      batch.batchQty -= item.transferQty;
      await batch.save({ session });

      // Deduct from source product facility
      const sourceFacility = await ProductFacility.findOne({
        workspaceId,
        facility_id: sourceBranchId,
        product_id: item.product,
      }).session(session);

      if (sourceFacility) {
        sourceFacility.total_qty_available -= item.transferQty;
        sourceFacility.qoh -= item.transferQty;
        await sourceFacility.save({ session });
      }
    }

    await transferOrder.save({ session });
    await session.commitTransaction();
    session.endSession();

    return transferOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const receiveTransferOrder = async (workspaceId, transferOrderId, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transferOrder = await TransferOrder.findOne({
      _id: transferOrderId,
      workspaceId,
    }).session(session);

    if (!transferOrder) {
      throw new ApiError(404, "Transfer Order not found");
    }

    if (transferOrder.status !== "IN_TRANSIT") {
      throw new ApiError(400, "Only IN_TRANSIT orders can be received");
    }

    for (const item of transferOrder.items) {
      // Find source batch to copy properties like mrp, rates, etc.
      const sourceBatch = await Batch.findOne({
        _id: item.batch,
      }).session(session);

      if (!sourceBatch) {
        throw new ApiError(404, `Source batch ${item.batchNo} not found`);
      }

      // Find or create destination batch
      let destBatch = await Batch.findOne({
        workspaceId,
        branch_id: transferOrder.destinationBranchId,
        product: item.product,
        batchNo: item.batchNo,
        expiryDate: sourceBatch.expiryDate, // using expiry as key
      }).session(session);

      if (destBatch) {
        destBatch.batchQty += item.transferQty;
        await destBatch.save({ session });
      } else {
        // Create new batch for destination
        destBatch = new Batch({
          workspaceId,
          branch_id: transferOrder.destinationBranchId,
          product: item.product,
          batchNo: item.batchNo,
          batchQty: item.transferQty,
          mrp: sourceBatch.mrp,
          MRP: sourceBatch.MRP,
          ptr: sourceBatch.ptr,
          pts: sourceBatch.pts,
          rate: sourceBatch.rate,
          finalRateA: sourceBatch.finalRateA,
          finalRateB: sourceBatch.finalRateB,
          finalRateC: sourceBatch.finalRateC,
          rateA: sourceBatch.rateA,
          rateB: sourceBatch.rateB,
          rateC: sourceBatch.rateC,
          expiryDate: sourceBatch.expiryDate,
        });
        await destBatch.save({ session });
      }

      // Update destination product facility
      let destFacility = await ProductFacility.findOne({
        workspaceId,
        facility_id: transferOrder.destinationBranchId,
        product_id: item.product,
      }).session(session);

      if (destFacility) {
        destFacility.total_qty_available += item.transferQty;
        destFacility.qoh += item.transferQty;
        await destFacility.save({ session });
      } else {
        destFacility = new ProductFacility({
          workspaceId,
          facility_id: transferOrder.destinationBranchId,
          product_id: item.product,
          total_qty_available: item.transferQty,
          qoh: item.transferQty,
        });
        await destFacility.save({ session });
      }
    }

    transferOrder.status = "COMPLETED";
    transferOrder.receivedBy = user._id;
    transferOrder.receivedAt = new Date();
    await transferOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    return transferOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getTransferOrders = async (workspaceId, filters, pagination) => {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const query = { workspaceId };
  if (filters.status) query.status = filters.status;
  if (filters.sourceBranchId) query.sourceBranchId = filters.sourceBranchId;
  if (filters.destinationBranchId) query.destinationBranchId = filters.destinationBranchId;

  const total = await TransferOrder.countDocuments(query);
  const transferOrders = await TransferOrder.find(query)
    .populate("sourceBranchId", "name branchCode")
    .populate("destinationBranchId", "name branchCode")
    .populate("createdBy", "name")
    .populate("receivedBy", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { total, transferOrders, page, limit };
};

export const getTransferOrderById = async (workspaceId, transferOrderId) => {
  const transferOrder = await TransferOrder.findOne({
    _id: transferOrderId,
    workspaceId,
  })
    .populate("sourceBranchId", "name branchCode")
    .populate("destinationBranchId", "name branchCode")
    .populate("createdBy", "name")
    .populate("receivedBy", "name")
    .populate("items.product", "name")
    .lean();

  if (!transferOrder) {
    throw new ApiError(404, "Transfer Order not found");
  }

  return transferOrder;
};

export default {
  createTransferOrder,
  receiveTransferOrder,
  getTransferOrders,
  getTransferOrderById,
};
