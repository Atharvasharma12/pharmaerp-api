import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import permissionMiddleware from "../../../../middlewares/permission.middleware.js";

import {
  searchBeforeCreateWorkspaceProduct,
  createWorkspaceProduct,
  getWorkspaceProducts,
  getWorkspaceProductById,
  getWorkspaceProductByCode,
  updateWorkspaceProduct,
  deleteWorkspaceProduct,
} from "../controllers/workspaceProduct.controller.js";

import {
  createWorkspaceProductSchema,
  updateWorkspaceProductSchema,
  workspaceProductIdParamSchema,
  workspaceProductCodeParamSchema,
  getWorkspaceProductsQuerySchema,
  searchBeforeCreateQuerySchema,
} from "../validations/workspaceProduct.validation.js";

const router = Router();

// All workspace product routes require authentication + active workspace membership
router.use(authMiddleware);
router.use(workspaceContextMiddleware);

// ---------------------
// GET /catalog/products
// ---------------------
router.get(
  "/",
  validate(getWorkspaceProductsQuerySchema, "query"),
  getWorkspaceProducts,
);

// ---------------------
// GET /catalog/products/search?name=...&productType=...
// Search global catalog BEFORE creating a workspace product.
// Frontend calls this first to check for existing global products.
// ---------------------
router.get(
  "/search",
  validate(searchBeforeCreateQuerySchema, "query"),
  searchBeforeCreateWorkspaceProduct,
);

// ---------------------
// GET /catalog/products/code/:productCode
// ---------------------
router.get(
  "/code/:productCode",
  validate(workspaceProductCodeParamSchema, "params"),
  getWorkspaceProductByCode,
);

// ---------------------
// GET /catalog/products/:productId
// ---------------------
router.get(
  "/:productId",
  validate(workspaceProductIdParamSchema, "params"),
  getWorkspaceProductById,
);

// ---------------------
// POST /catalog/products
// ---------------------
router.post(
  "/",
  permissionMiddleware("catalog:product:create"),
  validate(createWorkspaceProductSchema),
  createWorkspaceProduct,
);

// ---------------------
// PATCH /catalog/products/:productId
// ---------------------
router.patch(
  "/:productId",
  permissionMiddleware("catalog:product:update"),
  validate(workspaceProductIdParamSchema, "params"),
  validate(updateWorkspaceProductSchema),
  updateWorkspaceProduct,
);

// ---------------------
// DELETE /catalog/products/:productId
// ---------------------
router.delete(
  "/:productId",
  permissionMiddleware("catalog:product:delete"),
  validate(workspaceProductIdParamSchema, "params"),
  deleteWorkspaceProduct,
);

export default router;
