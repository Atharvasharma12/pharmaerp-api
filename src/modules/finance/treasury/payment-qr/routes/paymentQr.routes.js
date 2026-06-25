import { Router } from "express";
import authMiddleware from "../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../middlewares/validate.middleware.js";

import {
  createPaymentQr,
  getPaymentQrs,
  getPaymentQrById,
  updatePaymentQr,
  deletePaymentQr,
  setPrimary,
} from "../controllers/paymentQr.controller.js";

import {
  createPaymentQrSchema,
  updatePaymentQrSchema,
  paymentQrIdParamSchema,
  getPaymentQrsQuerySchema,
} from "../validations/paymentQr.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Routes
router.post("/", validate(createPaymentQrSchema), createPaymentQr);
router.get("/", validate(getPaymentQrsQuerySchema, "query"), getPaymentQrs);

router.get(
  "/:paymentQrId",
  validate(paymentQrIdParamSchema, "params"),
  getPaymentQrById,
);

router.patch(
  "/:paymentQrId",
  validate(paymentQrIdParamSchema, "params"),
  validate(updatePaymentQrSchema),
  updatePaymentQr,
);

router.delete(
  "/:paymentQrId",
  validate(paymentQrIdParamSchema, "params"),
  deletePaymentQr,
);

router.post(
  "/:paymentQrId/set-primary",
  validate(paymentQrIdParamSchema, "params"),
  setPrimary,
);

export default router;
