import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createUomMaster,
  getUomMasters,
  getUomMasterById,
  updateUomMaster,
  deleteUomMaster,
} from "../controllers/uomMaster.controller.js";

import {
  createUomMasterSchema,
  updateUomMasterSchema,
  uomMasterIdParamSchema,
  getUomMastersQuerySchema,
} from "../validations/uomMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/uom-master
// ---------------------
router.get(
  "/",
  validate(getUomMastersQuerySchema, "query"),
  getUomMasters,
);

// ---------------------
// GET /global-catalog/uom-master/:uomId
// ---------------------
router.get(
  "/:uomId",
  validate(uomMasterIdParamSchema, "params"),
  getUomMasterById,
);

// ---------------------
// POST /global-catalog/uom-master
// ---------------------
router.post(
  "/",
  validate(createUomMasterSchema),
  createUomMaster,
);

// ---------------------
// PATCH /global-catalog/uom-master/:uomId
// ---------------------
router.patch(
  "/:uomId",
  validate(uomMasterIdParamSchema, "params"),
  validate(updateUomMasterSchema),
  updateUomMaster,
);

// ---------------------
// DELETE /global-catalog/uom-master/:uomId
// ---------------------
router.delete(
  "/:uomId",
  validate(uomMasterIdParamSchema, "params"),
  deleteUomMaster,
);

export default router;
