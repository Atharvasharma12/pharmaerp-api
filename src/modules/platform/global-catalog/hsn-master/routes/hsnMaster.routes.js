import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createHsnMaster,
  getHsnMasters,
  getHsnMasterById,
  getHsnMasterByCode,
  updateHsnMaster,
  deleteHsnMaster,
} from "../controllers/hsnMaster.controller.js";

import {
  createHsnMasterSchema,
  updateHsnMasterSchema,
  hsnMasterIdParamSchema,
  hsnMasterCodeParamSchema,
  getHsnMastersQuerySchema,
} from "../validations/hsnMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/hsn-master
// ---------------------
router.get(
  "/",
  validate(getHsnMastersQuerySchema, "query"),
  getHsnMasters,
);

// ---------------------
// GET /global-catalog/hsn-master/code/:hsnCode
// ---------------------
router.get(
  "/code/:hsnCode",
  validate(hsnMasterCodeParamSchema, "params"),
  getHsnMasterByCode,
);

// ---------------------
// GET /global-catalog/hsn-master/:hsnId
// ---------------------
router.get(
  "/:hsnId",
  validate(hsnMasterIdParamSchema, "params"),
  getHsnMasterById,
);

// ---------------------
// POST /global-catalog/hsn-master
// ---------------------
router.post(
  "/",
  validate(createHsnMasterSchema),
  createHsnMaster,
);

// ---------------------
// PATCH /global-catalog/hsn-master/:hsnId
// ---------------------
router.patch(
  "/:hsnId",
  validate(hsnMasterIdParamSchema, "params"),
  validate(updateHsnMasterSchema),
  updateHsnMaster,
);

// ---------------------
// DELETE /global-catalog/hsn-master/:hsnId
// ---------------------
router.delete(
  "/:hsnId",
  validate(hsnMasterIdParamSchema, "params"),
  deleteHsnMaster,
);

export default router;
