import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  getAllStores,
  getStoreById,
  setOnlineStatus,
  closeStore,
  getStoreStats,
} from "../controllers/platformMarketplaceStore.controller.js";

import {
  storeIdParamSchema,
  setOnlineStatusSchema,
  listStoresQuerySchema,
} from "../validations/platformMarketplaceStore.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

// Stats dashboard — any platform user
router.get("/stats", getStoreStats);

// List all stores (platform-wide) with filters
router.get(
  "/",
  validate(listStoresQuerySchema, "query"),
  getAllStores,
);

// Get single store by ID
router.get(
  "/:storeId",
  validate(storeIdParamSchema, "params"),
  getStoreById,
);

// Override online/offline status — SUPER_ADMIN, ADMIN, SUPPORT
router.patch(
  "/:storeId/online-status",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
  ),
  validate(storeIdParamSchema, "params"),
  validate(setOnlineStatusSchema),
  setOnlineStatus,
);

// Force-close a store — SUPER_ADMIN, ADMIN only
router.delete(
  "/:storeId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(storeIdParamSchema, "params"),
  closeStore,
);

export default router;
