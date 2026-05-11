import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  purchaseSubscription,
  renewSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  updateSeatQuantity,
  getSubscriptionById,
  getWorkspaceCurrentSubscription,
  getWorkspaceSubscriptions,
  getSubscriptions,
  cancelSubscription,
  syncActiveSeatCount,
  validateSeatAvailability,
} from "../controllers/subscription.controller.js";

import {
  purchaseSubscriptionSchema,
  renewSubscriptionSchema,
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  changeSeatQuantitySchema,
  cancelSubscriptionSchema,
} from "../validations/subscription.validation.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/purchase",
  validate(purchaseSubscriptionSchema),
  purchaseSubscription,
);

router.post("/renew", validate(renewSubscriptionSchema), renewSubscription);

router.post(
  "/upgrade",
  validate(upgradeSubscriptionSchema),
  upgradeSubscription,
);

router.post(
  "/downgrade",
  validate(downgradeSubscriptionSchema),
  scheduleDowngrade,
);

router.post(
  "/change-seats",
  validate(changeSeatQuantitySchema),
  updateSeatQuantity,
);

router.post("/cancel", validate(cancelSubscriptionSchema), cancelSubscription);

router.get("/", getSubscriptions);

router.get("/:subscriptionId", getSubscriptionById);

router.get("/workspace/:workspaceId/current", getWorkspaceCurrentSubscription);

router.get("/workspace/:workspaceId/history", getWorkspaceSubscriptions);

router.post("/workspace/:workspaceId/sync-seats", syncActiveSeatCount);

router.get("/workspace/:workspaceId/check-seats", validateSeatAvailability);

export default router;
