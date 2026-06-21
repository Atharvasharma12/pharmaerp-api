import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";
import permissionMiddleware from "../../../../middlewares/permission.middleware.js";
import validate from "../../../../middlewares/validate.middleware.js";

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
  getSupplierOutstanding,
  getSupplierPurchases,
  getSupplierPayments,
} from "../controllers/supplier.controller.js";

import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierIdParamSchema,
  getSuppliersQuerySchema,
} from "../validations/supplier.validation.js";

import { PERMISSIONS } from "../../../../core/access-control/constants/permission.constant.js";

const router = Router();

// Middleware chain for all supplier endpoints
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// CRUD
router.post(
  "/",
  permissionMiddleware(PERMISSIONS.SUPPLIER_CREATE),
  validate(createSupplierSchema),
  createSupplier
);

router.get(
  "/",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(getSuppliersQuerySchema, "query"),
  getSuppliers
);

router.get(
  "/:supplierId",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(supplierIdParamSchema, "params"),
  getSupplierById
);

router.patch(
  "/:supplierId",
  permissionMiddleware(PERMISSIONS.SUPPLIER_UPDATE),
  validate(supplierIdParamSchema, "params"),
  validate(updateSupplierSchema),
  updateSupplier
);

router.delete(
  "/:supplierId",
  permissionMiddleware(PERMISSIONS.SUPPLIER_DELETE),
  validate(supplierIdParamSchema, "params"),
  deleteSupplier
);

// Additional APIs
router.get(
  "/:supplierId/ledger",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(supplierIdParamSchema, "params"),
  getSupplierLedger
);

router.get(
  "/:supplierId/outstanding",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(supplierIdParamSchema, "params"),
  getSupplierOutstanding
);

router.get(
  "/:supplierId/purchases",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(supplierIdParamSchema, "params"),
  getSupplierPurchases
);

router.get(
  "/:supplierId/payments",
  permissionMiddleware(PERMISSIONS.SUPPLIER_VIEW),
  validate(supplierIdParamSchema, "params"),
  getSupplierPayments
);

export default router;
