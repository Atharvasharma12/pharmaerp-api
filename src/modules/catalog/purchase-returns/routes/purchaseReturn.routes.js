import { Router } from "express";
import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../middlewares/validate.middleware.js";

import {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  getEligibleBatches,
  cancelPurchaseReturn,
} from "../controllers/purchaseReturn.controller.js";

import {
  createPurchaseReturnSchema,
  getPurchaseReturnsQuerySchema,
  getEligibleBatchesQuerySchema,
  purchaseReturnIdParamSchema,
  cancelPurchaseReturnSchema,
} from "../validations/purchaseReturn.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Get eligible batches with FIFO inflow details
router.get(
  "/eligible-batches",
  validate(getEligibleBatchesQuerySchema, "query"),
  getEligibleBatches
);

// Create purchase return
router.post(
  "/",
  validate(createPurchaseReturnSchema),
  createPurchaseReturn
);

// List purchase returns
router.get(
  "/",
  validate(getPurchaseReturnsQuerySchema, "query"),
  getPurchaseReturns
);

// Get single purchase return by ID
router.get(
  "/:returnId",
  validate(purchaseReturnIdParamSchema, "params"),
  getPurchaseReturnById
);

// Cancel purchase return and reverse stock
router.post(
  "/:returnId/cancel",
  validate(purchaseReturnIdParamSchema, "params"),
  validate(cancelPurchaseReturnSchema),
  cancelPurchaseReturn
);

export default router;
