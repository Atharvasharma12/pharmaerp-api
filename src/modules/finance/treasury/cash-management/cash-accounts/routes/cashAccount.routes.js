import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  createCashAccount,
  getCashAccounts,
  getCashAccountById,
  updateCashAccount,
  deleteCashAccount,
  setPrimary,
} from "../controllers/cashAccount.controller.js";

import {
  createCashAccountSchema,
  updateCashAccountSchema,
  cashAccountIdParamSchema,
  getCashAccountsQuerySchema,
} from "../validations/cashAccount.validation.js";

const router = Router();

// Middleware chain for context
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Routes
router.post("/", validate(createCashAccountSchema), createCashAccount);
router.get("/", validate(getCashAccountsQuerySchema, "query"), getCashAccounts);

router.get(
  "/:cashAccountId",
  validate(cashAccountIdParamSchema, "params"),
  getCashAccountById,
);

router.patch(
  "/:cashAccountId",
  validate(cashAccountIdParamSchema, "params"),
  validate(updateCashAccountSchema),
  updateCashAccount,
);

router.delete(
  "/:cashAccountId",
  validate(cashAccountIdParamSchema, "params"),
  deleteCashAccount,
);

router.post(
  "/:cashAccountId/set-primary",
  validate(cashAccountIdParamSchema, "params"),
  setPrimary,
);

export default router;
