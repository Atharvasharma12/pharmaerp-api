import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import customerService from "../services/customer.service.js";

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Customer created successfully", customer));
});

export const getCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomers(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customers fetched successfully", result));
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer fetched successfully", customer));
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer updated successfully", customer));
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer deleted successfully"));
});

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const ledger = await customerService.getCustomerLedger(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer ledger fetched successfully", ledger));
});

export const getCustomerOutstanding = asyncHandler(async (req, res) => {
  const outstanding = await customerService.getCustomerOutstanding(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer outstanding fetched successfully", outstanding));
});

export const getCustomerSales = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] ||
    req.branchId ||
    req.query.branchId ||
    null;

  const sales = await customerService.getCustomerSales(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    branchId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer sales fetched successfully", sales));
});

export const recordCustomerSale = asyncHandler(async (req, res) => {
  const branchId =
    req.headers["x-branch-id"] ||
    req.branchId ||
    req.body.branchId ||
    req.query.branchId ||
    null;

  const result = await customerService.recordCustomerSale(
    req.params.customerId,
    { ...req.body, branchId },
    req.companyId,
    req.workspaceId,
    req.user
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Customer sale invoice recorded successfully", result));
});

export const getCustomerPayments = asyncHandler(async (req, res) => {
  const payments = await customerService.getCustomerPayments(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer payments fetched successfully", payments));
});
