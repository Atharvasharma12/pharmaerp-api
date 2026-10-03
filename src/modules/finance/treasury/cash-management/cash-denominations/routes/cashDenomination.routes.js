import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  createCashDenomination,
  getCashDenominations,
  getCashDenominationById,
  confirmCashDenomination,
  cancelCashDenomination,
} from "../controllers/cashDenomination.controller.js";

import {
  createCashDenominationSchema,
  confirmCashDenominationSchema,
  cancelCashDenominationSchema,
  cashDenominationIdParamSchema,
  getCashDenominationsQuerySchema,
} from "../validations/cashDenomination.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Collection routes
router.post("/", validate(createCashDenominationSchema), createCashDenomination);
router.get("/", validate(getCashDenominationsQuerySchema, "query"), getCashDenominations);

// Document routes
router.get(
  "/:cashDenominationId",
  validate(cashDenominationIdParamSchema, "params"),
  getCashDenominationById,
);

// Lifecycle action routes
router.post(
  "/:cashDenominationId/confirm",
  validate(cashDenominationIdParamSchema, "params"),
  validate(confirmCashDenominationSchema),
  confirmCashDenomination,
);

router.post(
  "/:cashDenominationId/cancel",
  validate(cashDenominationIdParamSchema, "params"),
  validate(cancelCashDenominationSchema),
  cancelCashDenomination,
);

export default router;
