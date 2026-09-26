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
} from "../controllers/customer.controller.js";

import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomersQuerySchema,
} from "../validations/customer.validation.js";

const router = Router();

// Middleware chain for all customer endpoints
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// CRUD
router.post("/", validate(createCustomerSchema), createCustomer);

router.get("/", validate(getCustomersQuerySchema, "query"), getCustomers);

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

export default router;
