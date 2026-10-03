import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";

import {
  getCatalogHsnMasters,
  getCatalogHsnMasterByCode,
  getCatalogHsnMasterById,
} from "../controllers/catalogHsnMaster.controller.js";

import {
  getCatalogHsnMastersQuerySchema,
  catalogHsnMasterIdParamSchema,
  catalogHsnMasterCodeParamSchema,
} from "../validations/catalogHsnMaster.validation.js";

const router = Router();

// All requests must come from an authenticated user inside an active workspace
router.use(authMiddleware);
router.use(workspaceContextMiddleware);

// ---------------------
// GET /catalog/hsn-master
// ---------------------
router.get(
  "/",
  validate(getCatalogHsnMastersQuerySchema, "query"),
  getCatalogHsnMasters,
);

// ---------------------
// GET /catalog/hsn-master/code/:hsnCode
// ---------------------
router.get(
  "/code/:hsnCode",
  validate(catalogHsnMasterCodeParamSchema, "params"),
  getCatalogHsnMasterByCode,
);

// ---------------------
// GET /catalog/hsn-master/:hsnId
// ---------------------
router.get(
  "/:hsnId",
  validate(catalogHsnMasterIdParamSchema, "params"),
  getCatalogHsnMasterById,
);

export default router;
