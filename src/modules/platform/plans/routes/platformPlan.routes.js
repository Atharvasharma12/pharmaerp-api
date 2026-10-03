import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  createPlatformPlan,
  getPlatformPlans,
  getPlatformPlanById,
  updatePlatformPlan,
  deletePlatformPlan,
} from "../controllers/platformPlan.controller.js";

import {
  createPlatformPlanSchema,
  updatePlatformPlanSchema,
  platformPlanIdParamSchema,
} from "../validations/platformPlan.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

router.get("/", getPlatformPlans);

router.get(
  "/:planId",
  validate(platformPlanIdParamSchema, "params"),
  getPlatformPlanById,
);

router.post(
  "/",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(createPlatformPlanSchema),
  createPlatformPlan,
);

router.patch(
  "/:planId",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.BILLING_MANAGER,
  ),
  validate(platformPlanIdParamSchema, "params"),
  validate(updatePlatformPlanSchema),
  updatePlatformPlan,
);

router.delete(
  "/:planId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(platformPlanIdParamSchema, "params"),
  deletePlatformPlan,
);

export default router;
