import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  createCashExchange,
  getCashExchanges,
  getCashExchangeById,
  cancelCashExchange,
} from "../controllers/cashExchange.controller.js";

import {
  createCashExchangeSchema,
  cancelCashExchangeSchema,
  cashExchangeIdParamSchema,
  getCashExchangesQuerySchema,
} from "../validations/cashExchange.validation.js";

const router = Router();

// Middleware chain
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Routes
router.post("/", validate(createCashExchangeSchema), createCashExchange);
router.get("/", validate(getCashExchangesQuerySchema, "query"), getCashExchanges);

router.get(
  "/:cashExchangeId",
  validate(cashExchangeIdParamSchema, "params"),
  getCashExchangeById,
);

router.post(
  "/:cashExchangeId/cancel",
  validate(cashExchangeIdParamSchema, "params"),
  validate(cancelCashExchangeSchema),
  cancelCashExchange,
);

export default router;
