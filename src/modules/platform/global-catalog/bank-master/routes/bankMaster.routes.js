import { Router } from "express";

import validate from "../../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../../middlewares/platformAuth.middleware.js";

import {
  createBankMaster,
  getBankMasters,
  getBankMasterById,
  updateBankMaster,
  deleteBankMaster,
} from "../controllers/bankMaster.controller.js";

import {
  createBankMasterSchema,
  updateBankMasterSchema,
  bankMasterIdParamSchema,
  getBankMastersQuerySchema,
} from "../validations/bankMaster.validation.js";

const router = Router();

// All routes require platform authentication
router.use(platformAuthMiddleware);

// ---------------------
// GET /global-catalog/bank-master
// ---------------------
router.get(
  "/",
  validate(getBankMastersQuerySchema, "query"),
  getBankMasters,
);

// ---------------------
// GET /global-catalog/bank-master/:bankId
// ---------------------
router.get(
  "/:bankId",
  validate(bankMasterIdParamSchema, "params"),
  getBankMasterById,
);

// ---------------------
// POST /global-catalog/bank-master
// ---------------------
router.post(
  "/",
  validate(createBankMasterSchema),
  createBankMaster,
);

// ---------------------
// PATCH /global-catalog/bank-master/:bankId
// ---------------------
router.patch(
  "/:bankId",
  validate(bankMasterIdParamSchema, "params"),
  validate(updateBankMasterSchema),
  updateBankMaster,
);

// ---------------------
// DELETE /global-catalog/bank-master/:bankId
// ---------------------
router.delete(
  "/:bankId",
  validate(bankMasterIdParamSchema, "params"),
  deleteBankMaster,
);

export default router;
