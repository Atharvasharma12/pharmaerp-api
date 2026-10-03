import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import allowPlatformRoles from "../../../../middlewares/platformRole.middleware.js";

import {
  createPlatformUser,
  getPlatformUsers,
  getPlatformUserById,
  updatePlatformUser,
  deletePlatformUser,
} from "../controllers/platformUser.controller.js";

import {
  createPlatformUserSchema,
  updatePlatformUserSchema,
} from "../validations/platformUser.validation.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

const router = Router();

router.use(platformAuthMiddleware);

router.get(
  "/",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.READ_ONLY,
  ),
  getPlatformUsers,
);

router.post(
  "/",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(createPlatformUserSchema),
  createPlatformUser,
);

router.get(
  "/:platformUserId",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.READ_ONLY,
  ),
  getPlatformUserById,
);

router.patch(
  "/:platformUserId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(updatePlatformUserSchema),
  updatePlatformUser,
);

router.delete(
  "/:platformUserId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN),
  deletePlatformUser,
);

export default router;
