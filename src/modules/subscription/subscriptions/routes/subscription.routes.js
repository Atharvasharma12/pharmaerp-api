import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  purchaseSubscription,
  startTrialSubscription,
  renewSubscription,
  upgradeSubscription,
  scheduleDowngrade,
  updateSeatQuantity,
  getSubscriptionById,
  getWorkspaceCurrentSubscription,
  getWorkspaceSubscriptions,
  cancelSubscription,
  syncActiveSeatCount,
  validateSeatAvailability,
} from "../controllers/subscription.controller.js";

import {
  purchaseSubscriptionSchema,
  startTrialSubscriptionSchema,
  renewSubscriptionSchema,
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  changeSeatQuantitySchema,
  cancelSubscriptionSchema,
  subscriptionIdParamSchema,
  workspaceIdParamSchema,
} from "../validations/subscription.validation.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/purchase",
  validate(purchaseSubscriptionSchema),
  purchaseSubscription,
);

router.post(
  "/trial",
  validate(startTrialSubscriptionSchema),
  startTrialSubscription,
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

router.get(
  "/workspace/:workspaceId/current",
  validate(workspaceIdParamSchema, "params"),
  getWorkspaceCurrentSubscription,
);

router.get(
  "/workspace/:workspaceId/history",
  validate(workspaceIdParamSchema, "params"),
  getWorkspaceSubscriptions,
);

router.post(
  "/workspace/:workspaceId/sync-seats",
  validate(workspaceIdParamSchema, "params"),
  syncActiveSeatCount,
);

router.get(
  "/workspace/:workspaceId/check-seats",
  validate(workspaceIdParamSchema, "params"),
  validateSeatAvailability,
);

router.get(
  "/:subscriptionId",
  validate(subscriptionIdParamSchema, "params"),
  getSubscriptionById,
);

export default router;
