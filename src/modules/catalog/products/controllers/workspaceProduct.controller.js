import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import workspaceProductService from "../services/workspaceProduct.service.js";

/**
 * WorkspaceProduct Controller
 *
 * Architecture context (gpnotes.md):
 * ────────────────────────────────────
 * - Workspace Products exist only when no matching Global Product is found.
 * - All operations are scoped to req.workspaceId (set by workspaceContextMiddleware).
 * - productType is immutable after creation.
 * - HsnMaster is populated on all GET responses.
 * - Downstream modules (Inventory, Batch, Purchase, Sales) reference these as:
 *     { productSource: "WORKSPACE", productId: ObjectId }
 */

/**
 * Search the global catalog before creating a workspace product.
 * The frontend should call this first, show suggestions, and only
 * call POST /products if the user explicitly wants a workspace product.
 */
export const searchBeforeCreateWorkspaceProduct = asyncHandler(async (req, res) => {
  const { name, productType } = req.query;

  const result = await workspaceProductService.searchBeforeCreate(
    name,
    req.workspaceId,
    productType || null,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Product search completed", result),
    );
});

export const createWorkspaceProduct = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.createWorkspaceProduct(
    req.workspaceId,
    req.body,
    req.user,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Workspace product created successfully", product),
    );
});

export const getWorkspaceProducts = asyncHandler(async (req, res) => {
  const { status, productType, search, page, limit } = req.query;

  const result = await workspaceProductService.getWorkspaceProducts(
    req.workspaceId,
    { status, productType, search },
    { page, limit },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace products fetched successfully", result),
    );
});

export const getWorkspaceProductById = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.getWorkspaceProductById(
    req.params.productId,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product fetched successfully", product),
    );
});

export const getWorkspaceProductByCode = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.getWorkspaceProductByCode(
    req.params.productCode,
    req.workspaceId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product fetched successfully", product),
    );
});

export const updateWorkspaceProduct = asyncHandler(async (req, res) => {
  const product = await workspaceProductService.updateWorkspaceProduct(
    req.params.productId,
    req.workspaceId,
    req.body,
    req.user,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Workspace product updated successfully", product),
    );
});

export const deleteWorkspaceProduct = asyncHandler(async (req, res) => {
  await workspaceProductService.deleteWorkspaceProduct(
    req.params.productId,
    req.workspaceId,
    req.user,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Workspace product deleted successfully"));
});
