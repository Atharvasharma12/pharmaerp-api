import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";
import permissionMiddleware from "../../../../middlewares/permission.middleware.js";
import validate from "../../../../middlewares/validate.middleware.js";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  getCustomerSales,
  getCustomerPayments,
} from "../controllers/customer.controller.js";

import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomersQuerySchema,
} from "../validations/customer.validation.js";

import { PERMISSIONS } from "../../../../core/access-control/constants/permission.constant.js";

const router = Router();

// Middleware chain for all customer endpoints
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// CRUD
router.post(
  "/",
  permissionMiddleware(PERMISSIONS.CUSTOMER_CREATE),
  validate(createCustomerSchema),
  createCustomer
);

router.get(
  "/",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(getCustomersQuerySchema, "query"),
  getCustomers
);

router.get(
  "/:customerId",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(customerIdParamSchema, "params"),
  getCustomerById
);

router.patch(
  "/:customerId",
  permissionMiddleware(PERMISSIONS.CUSTOMER_UPDATE),
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema),
  updateCustomer
);

router.delete(
  "/:customerId",
  permissionMiddleware(PERMISSIONS.CUSTOMER_DELETE),
  validate(customerIdParamSchema, "params"),
  deleteCustomer
);

// Additional APIs
router.get(
  "/:customerId/ledger",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(customerIdParamSchema, "params"),
  getCustomerLedger
);

router.get(
  "/:customerId/outstanding",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(customerIdParamSchema, "params"),
  getCustomerOutstanding
);

router.get(
  "/:customerId/sales",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(customerIdParamSchema, "params"),
  getCustomerSales
);

router.get(
  "/:customerId/payments",
  permissionMiddleware(PERMISSIONS.CUSTOMER_VIEW),
  validate(customerIdParamSchema, "params"),
  getCustomerPayments
);

export default router;
