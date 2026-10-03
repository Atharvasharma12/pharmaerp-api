import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createCategoryMaster,
  getCategoryMasters,
  getCategoryMasterById,
  getCategoryMasterBySlug,
  updateCategoryMaster,
  deleteCategoryMaster,
} from "../controllers/categoryMaster.controller.js";

import {
  createCategoryMasterSchema,
  updateCategoryMasterSchema,
  categoryMasterIdParamSchema,
  categoryMasterSlugParamSchema,
  getCategoryMastersQuerySchema,
} from "../validations/categoryMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/category-master
// ---------------------
router.get(
  "/",
  validate(getCategoryMastersQuerySchema, "query"),
  getCategoryMasters,
);

// ---------------------
// GET /global-catalog/category-master/slug/:slug
// ---------------------
router.get(
  "/slug/:slug",
  validate(categoryMasterSlugParamSchema, "params"),
  getCategoryMasterBySlug,
);

// ---------------------
// GET /global-catalog/category-master/:categoryId
// ---------------------
router.get(
  "/:categoryId",
  validate(categoryMasterIdParamSchema, "params"),
  getCategoryMasterById,
);

// ---------------------
// POST /global-catalog/category-master
// ---------------------
router.post(
  "/",
  validate(createCategoryMasterSchema),
  createCategoryMaster,
);

// ---------------------
// PATCH /global-catalog/category-master/:categoryId
// ---------------------
router.patch(
  "/:categoryId",
  validate(categoryMasterIdParamSchema, "params"),
  validate(updateCategoryMasterSchema),
  updateCategoryMaster,
);

// ---------------------
// DELETE /global-catalog/category-master/:categoryId
// ---------------------
router.delete(
  "/:categoryId",
  validate(categoryMasterIdParamSchema, "params"),
  deleteCategoryMaster,
);

export default router;
