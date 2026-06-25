import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  createBankSlip,
  getBankSlips,
  getBankSlipById,
  submitBankSlip,
  confirmBankSlip,
  rejectBankSlip,
  cancelBankSlip,
} from "../controllers/bankSlip.controller.js";

import {
  createBankSlipSchema,
  submitBankSlipSchema,
  confirmBankSlipSchema,
  rejectBankSlipSchema,
  cancelBankSlipSchema,
  bankSlipIdParamSchema,
  getBankSlipsQuerySchema,
} from "../validations/bankSlip.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Collection routes
router.post("/", validate(createBankSlipSchema), createBankSlip);
router.get("/", validate(getBankSlipsQuerySchema, "query"), getBankSlips);

// Document routes
router.get("/:bankSlipId", validate(bankSlipIdParamSchema, "params"), getBankSlipById);

// Lifecycle action routes
router.post(
  "/:bankSlipId/submit",
  validate(bankSlipIdParamSchema, "params"),
  validate(submitBankSlipSchema),
  submitBankSlip,
);

router.post(
  "/:bankSlipId/confirm",
  validate(bankSlipIdParamSchema, "params"),
  validate(confirmBankSlipSchema),
  confirmBankSlip,
);

router.post(
  "/:bankSlipId/reject",
  validate(bankSlipIdParamSchema, "params"),
  validate(rejectBankSlipSchema),
  rejectBankSlip,
);

router.post(
  "/:bankSlipId/cancel",
  validate(bankSlipIdParamSchema, "params"),
  validate(cancelBankSlipSchema),
  cancelBankSlip,
);

export default router;
