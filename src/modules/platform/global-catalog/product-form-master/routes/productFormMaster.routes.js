import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createProductFormMaster,
  getProductFormMasters,
  getProductFormMasterById,
  updateProductFormMaster,
  deleteProductFormMaster,
} from "../controllers/productFormMaster.controller.js";

import {
  createProductFormMasterSchema,
  updateProductFormMasterSchema,
  productFormMasterIdParamSchema,
  getProductFormMastersQuerySchema,
} from "../validations/productFormMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/product-form-master
// ---------------------
router.get(
  "/",
  validate(getProductFormMastersQuerySchema, "query"),
  getProductFormMasters,
);

// ---------------------
// GET /global-catalog/product-form-master/:formId
// ---------------------
router.get(
  "/:formId",
  validate(productFormMasterIdParamSchema, "params"),
  getProductFormMasterById,
);

// ---------------------
// POST /global-catalog/product-form-master
// ---------------------
router.post(
  "/",
  validate(createProductFormMasterSchema),
  createProductFormMaster,
);

// ---------------------
// PATCH /global-catalog/product-form-master/:formId
// ---------------------
router.patch(
  "/:formId",
  validate(productFormMasterIdParamSchema, "params"),
  validate(updateProductFormMasterSchema),
  updateProductFormMaster,
);

// ---------------------
// DELETE /global-catalog/product-form-master/:formId
// ---------------------
router.delete(
  "/:formId",
  validate(productFormMasterIdParamSchema, "params"),
  deleteProductFormMaster,
);

export default router;
