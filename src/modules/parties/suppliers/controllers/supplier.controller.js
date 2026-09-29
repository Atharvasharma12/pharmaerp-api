import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import supplierService from "../services/supplier.service.js";

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Supplier created successfully", supplier));
});

export const getSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.getSuppliers(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Suppliers fetched successfully", result));
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(
    req.params.supplierId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier fetched successfully", supplier));
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(
    req.params.supplierId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier updated successfully", supplier));
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(
    req.params.supplierId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier deleted successfully"));
});

export const getSupplierLedger = asyncHandler(async (req, res) => {
  const ledger = await supplierService.getSupplierLedger(
    req.params.supplierId,
    req.companyId,
    req.workspaceId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier ledger fetched successfully", ledger));
});

export const getSupplierOutstanding = asyncHandler(async (req, res) => {
  const outstanding = await supplierService.getSupplierOutstanding(
    req.params.supplierId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier outstanding fetched successfully", outstanding));
});

export const getSupplierPurchases = asyncHandler(async (req, res) => {
  const purchases = await supplierService.getSupplierPurchases(
    req.params.supplierId,
    req.companyId,
    req.workspaceId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier purchases fetched successfully", purchases));
});

export const getSupplierPayments = asyncHandler(async (req, res) => {
  const payments = await supplierService.getSupplierPayments(
    req.params.supplierId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Supplier payments fetched successfully", payments));
});
