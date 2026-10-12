import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../middlewares/validate.middleware.js";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  getCustomerPayments,
  getCustomerSales,
  previewImport,
  confirmImport,
  importChunk,
  receiveAdvance,
  getAdvanceBalance,
  settleCredit,
  getCreditOutstanding,
  getCustomerTransactions,
  getCustomerStatement,
  getAllPendingCredits,
} from "../controllers/customer.controller.js";

import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomersQuerySchema,
  receiveAdvanceSchema,
  settleCreditSchema,
  getTransactionsQuerySchema,
  getStatementQuerySchema,
} from "../validations/customer.validation.js";

const router = Router();

// Middleware chain for all customer endpoints
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);


import uploadFile from "../../../../middlewares/upload.middleware.js";

// Import APIs
router.post("/import/preview", uploadFile.single("file"), previewImport);
router.post("/import/confirm", confirmImport);
router.post("/import/chunk", importChunk);

// CRUD

router.post("/", validate(createCustomerSchema), createCustomer);

router.get("/", validate(getCustomersQuerySchema, "query"), getCustomers);

router.get("/credits/pending", getAllPendingCredits);

router.get(
  "/:customerId",
  validate(customerIdParamSchema, "params"),
  getCustomerById,
);

router.patch(
  "/:customerId",
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema),
  updateCustomer,
);

router.delete(
  "/:customerId",
  validate(customerIdParamSchema, "params"),
  deleteCustomer,
);

// Additional APIs
router.get(
  "/:customerId/ledger",
  validate(customerIdParamSchema, "params"),
  getCustomerLedger,
);

router.get(
  "/:customerId/outstanding",
  validate(customerIdParamSchema, "params"),
  getCustomerOutstanding,
);

router.get(
  "/:customerId/payments",
  validate(customerIdParamSchema, "params"),
  getCustomerPayments,
);

router.get(
  "/:customerId/sales",
  validate(customerIdParamSchema, "params"),
  getCustomerSales,
);

// Advance & Credit APIs
router.post(
  "/:customerId/advance/receive",
  validate(customerIdParamSchema, "params"),
  validate(receiveAdvanceSchema),
  receiveAdvance,
);

router.get(
  "/:customerId/advance/balance",
  validate(customerIdParamSchema, "params"),
  getAdvanceBalance,
);

router.post(
  "/:customerId/credit/settle",
  validate(customerIdParamSchema, "params"),
  validate(settleCreditSchema),
  settleCredit,
);

router.get(
  "/:customerId/credit/outstanding",
  validate(customerIdParamSchema, "params"),
  getCreditOutstanding,
);

router.get(
  "/:customerId/transactions",
  validate(customerIdParamSchema, "params"),
  validate(getTransactionsQuerySchema, "query"),
  getCustomerTransactions,
);

router.get(
  "/:customerId/statement",
  validate(customerIdParamSchema, "params"),
  validate(getStatementQuerySchema, "query"),
  getCustomerStatement,
);


export default router;
