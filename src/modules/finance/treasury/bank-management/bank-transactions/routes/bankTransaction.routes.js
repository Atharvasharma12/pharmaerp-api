import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  createBankTransaction,
  getBankTransactions,
  getBankTransactionById,
  cancelBankTransaction,
} from "../controllers/bankTransaction.controller.js";

import {
  createBankTransactionSchema,
  cancelBankTransactionSchema,
  bankTransactionIdParamSchema,
  getBankTransactionsQuerySchema,
} from "../validations/bankTransaction.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Routes
router.post("/", validate(createBankTransactionSchema), createBankTransaction);
router.get("/", validate(getBankTransactionsQuerySchema, "query"), getBankTransactions);

router.get(
  "/:bankTransactionId",
  validate(bankTransactionIdParamSchema, "params"),
  getBankTransactionById,
);

router.post(
  "/:bankTransactionId/cancel",
  validate(bankTransactionIdParamSchema, "params"),
  validate(cancelBankTransactionSchema),
  cancelBankTransaction,
);

export default router;
