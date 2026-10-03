import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  getMarketplaceSettings,
  updateMarketplaceSettings,
  enableMarketplace,
  disableMarketplace,
} from "../controllers/platformMarketplaceSettings.controller.js";

import { updateMarketplaceSettingsSchema } from "../validations/platformMarketplaceSettings.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

router.get("/", getMarketplaceSettings);

router.patch(
  "/",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(updateMarketplaceSettingsSchema),
  updateMarketplaceSettings,
);

router.patch(
  "/enable",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  enableMarketplace,
);

router.patch(
  "/disable",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  disableMarketplace,
);

export default router;
