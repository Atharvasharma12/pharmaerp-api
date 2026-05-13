import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  getPlatformSubscriptions,
  getPlatformSubscriptionById,
  getPlatformWorkspaceSubscriptions,
  updatePlatformSubscriptionStatus,
  updatePlatformSubscriptionPaymentStatus,
  renewPlatformSubscription,
  changePlatformSubscriptionPlan,
  cancelPlatformSubscription,
  extendPlatformSubscriptionTrial,
  deletePlatformSubscription,
} from "../controllers/platformSubscription.controller.js";

import {
  platformSubscriptionIdParamSchema,
  platformWorkspaceIdParamSchema,
  updatePlatformSubscriptionStatusSchema,
  updatePlatformSubscriptionPaymentStatusSchema,
  renewPlatformSubscriptionSchema,
  changePlatformSubscriptionPlanSchema,
  cancelPlatformSubscriptionSchema,
  extendPlatformSubscriptionTrialSchema,
} from "../validations/platformSubscription.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

router.get(
  "/",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.BILLING_MANAGER,
    PLATFORM_ROLES.READ_ONLY,
  ),
  getPlatformSubscriptions,
);

router.get(
  "/workspace/:workspaceId",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.BILLING_MANAGER,
    PLATFORM_ROLES.READ_ONLY,
  ),
  validate(platformWorkspaceIdParamSchema, "params"),
  getPlatformWorkspaceSubscriptions,
);

router.get(
  "/:subscriptionId",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.BILLING_MANAGER,
    PLATFORM_ROLES.READ_ONLY,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  getPlatformSubscriptionById,
);

router.patch(
  "/:subscriptionId/status",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(updatePlatformSubscriptionStatusSchema),
  updatePlatformSubscriptionStatus,
);

router.patch(
  "/:subscriptionId/payment-status",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(updatePlatformSubscriptionPaymentStatusSchema),
  updatePlatformSubscriptionPaymentStatus,
);

router.patch(
  "/:subscriptionId/renew",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(renewPlatformSubscriptionSchema),
  renewPlatformSubscription,
);

router.patch(
  "/:subscriptionId/change-plan",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(changePlatformSubscriptionPlanSchema),
  changePlatformSubscriptionPlan,
);

router.patch(
  "/:subscriptionId/cancel",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(cancelPlatformSubscriptionSchema),
  cancelPlatformSubscription,
);

router.patch(
  "/:subscriptionId/extend-trial",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformSubscriptionIdParamSchema, "params"),
  validate(extendPlatformSubscriptionTrialSchema),
  extendPlatformSubscriptionTrial,
);

router.delete(
  "/:subscriptionId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(platformSubscriptionIdParamSchema, "params"),
  deletePlatformSubscription,
);

export default router;
