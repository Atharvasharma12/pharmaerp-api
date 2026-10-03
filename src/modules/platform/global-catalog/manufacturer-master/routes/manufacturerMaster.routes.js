import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createManufacturerMaster,
  getManufacturerMasters,
  getManufacturerMasterById,
  updateManufacturerMaster,
  deleteManufacturerMaster,
} from "../controllers/manufacturerMaster.controller.js";

import {
  createManufacturerMasterSchema,
  updateManufacturerMasterSchema,
  manufacturerMasterIdParamSchema,
  getManufacturerMastersQuerySchema,
} from "../validations/manufacturerMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/manufacturer-master
// ---------------------
router.get(
  "/",
  validate(getManufacturerMastersQuerySchema, "query"),
  getManufacturerMasters,
);

// ---------------------
// GET /global-catalog/manufacturer-master/:manufacturerId
// ---------------------
router.get(
  "/:manufacturerId",
  validate(manufacturerMasterIdParamSchema, "params"),
  getManufacturerMasterById,
);

// ---------------------
// POST /global-catalog/manufacturer-master
// ---------------------
router.post(
  "/",
  validate(createManufacturerMasterSchema),
  createManufacturerMaster,
);

// ---------------------
// PATCH /global-catalog/manufacturer-master/:manufacturerId
// ---------------------
router.patch(
  "/:manufacturerId",
  validate(manufacturerMasterIdParamSchema, "params"),
  validate(updateManufacturerMasterSchema),
  updateManufacturerMaster,
);

// ---------------------
// DELETE /global-catalog/manufacturer-master/:manufacturerId
// ---------------------
router.delete(
  "/:manufacturerId",
  validate(manufacturerMasterIdParamSchema, "params"),
  deleteManufacturerMaster,
);

export default router;
