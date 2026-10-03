import { Router } from "express";


import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";


import {
  createGlobalProduct,
  getGlobalProducts,
  getGlobalProductById,
  getGlobalProductByCode,
  updateGlobalProduct,
  deleteGlobalProduct,
  incrementGlobalProductViews,
} from "../controllers/globalProduct.controller.js";

import {
  createGlobalProductSchema,
  updateGlobalProductSchema,
  globalProductIdParamSchema,
  globalProductCodeParamSchema,
  getGlobalProductsQuerySchema,
} from "../validations/globalProduct.validation.js";



const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/products
// ---------------------
router.get(
  "/",
  validate(getGlobalProductsQuerySchema, "query"),
  getGlobalProducts,
);

// ---------------------
// GET /global-catalog/products/code/:productCode
// ---------------------
router.get(
  "/code/:productCode",
  validate(globalProductCodeParamSchema, "params"),
  getGlobalProductByCode,
);

// ---------------------
// GET /global-catalog/products/:productId
// ---------------------
router.get(
  "/:productId",
  validate(globalProductIdParamSchema, "params"),
  getGlobalProductById,
);

// ---------------------
// POST /global-catalog/products
// ---------------------
router.post(
  "/",
  validate(createGlobalProductSchema),
  createGlobalProduct,
);

// ---------------------
// PATCH /global-catalog/products/:productId
// ---------------------
router.patch(
  "/:productId",
  validate(globalProductIdParamSchema, "params"),
  validate(updateGlobalProductSchema),
  updateGlobalProduct,
);

// ---------------------
// DELETE /global-catalog/products/:productId
// ---------------------
router.delete(
  "/:productId",
  validate(globalProductIdParamSchema, "params"),
  deleteGlobalProduct,
);

// ---------------------
// POST /global-catalog/products/:productId/views
// ---------------------
router.post(
  "/:productId/views",
  validate(globalProductIdParamSchema, "params"),
  incrementGlobalProductViews,
);

export default router;
