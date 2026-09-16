import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../middlewares/validate.middleware.js";

import {
  createPurchaseBill,
  updatePurchaseBill,
  getPurchaseBills,
  getPurchaseBillById,
} from "../controllers/purchaseBill.controller.js";

import {
  createPurchaseBillSchema,
  updatePurchaseBillSchema,
  purchaseBillIdParamSchema,
  getPurchaseBillsQuerySchema,
} from "../validations/purchaseBill.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Create purchase bill
router.post("/", validate(createPurchaseBillSchema), createPurchaseBill);

// Update purchase bill
router.put(
  "/:billId",
  validate(purchaseBillIdParamSchema, "params"),
  validate(updatePurchaseBillSchema),
  updatePurchaseBill
);

// List purchase bills
router.get(
  "/",
  validate(getPurchaseBillsQuerySchema, "query"),
  getPurchaseBills
);

// Get purchase bill by id
router.get(
  "/:billId",
  validate(purchaseBillIdParamSchema, "params"),
  getPurchaseBillById
);

export default router;
