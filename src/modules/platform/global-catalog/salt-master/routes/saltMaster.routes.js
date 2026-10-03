import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createSaltMaster,
  getSaltMasters,
  getSaltMasterById,
  updateSaltMaster,
  deleteSaltMaster,
} from "../controllers/saltMaster.controller.js";

import {
  createSaltMasterSchema,
  updateSaltMasterSchema,
  saltMasterIdParamSchema,
  getSaltMastersQuerySchema,
} from "../validations/saltMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/salt-master
// ---------------------
router.get(
  "/",
  validate(getSaltMastersQuerySchema, "query"),
  getSaltMasters,
);

// ---------------------
// GET /global-catalog/salt-master/:saltId
// ---------------------
router.get(
  "/:saltId",
  validate(saltMasterIdParamSchema, "params"),
  getSaltMasterById,
);

// ---------------------
// POST /global-catalog/salt-master
// ---------------------
router.post(
  "/",
  validate(createSaltMasterSchema),
  createSaltMaster,
);

// ---------------------
// PATCH /global-catalog/salt-master/:saltId
// ---------------------
router.patch(
  "/:saltId",
  validate(saltMasterIdParamSchema, "params"),
  validate(updateSaltMasterSchema),
  updateSaltMaster,
);

// ---------------------
// DELETE /global-catalog/salt-master/:saltId
// ---------------------
router.delete(
  "/:saltId",
  validate(saltMasterIdParamSchema, "params"),
  deleteSaltMaster,
);

export default router;
