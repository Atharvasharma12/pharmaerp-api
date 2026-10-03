import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  getAllVerifications,
  getVerificationByStoreId,
  markUnderReview,
  approveStore,
  rejectStore,
  suspendStore,
  unsuspendStore,
  getVerificationStats,
} from "../controllers/platformStoreVerification.controller.js";

import {
  storeIdParamSchema,
  approveStoreSchema,
  rejectStoreSchema,
  suspendStoreSchema,
  listVerificationsQuerySchema,
} from "../validations/platformStoreVerification.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

// Stats — any platform user can view
router.get("/stats", getVerificationStats);

// List all verifications — any platform user can view
router.get(
  "/",
  validate(listVerificationsQuerySchema, "query"),
  getAllVerifications,
);

// Get verification for a specific store
router.get(
  "/:storeId",
  validate(storeIdParamSchema, "params"),
  getVerificationByStoreId,
);

// Mark as under review — SUPER_ADMIN, ADMIN, SUPPORT
router.patch(
  "/:storeId/under-review",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
  ),
  validate(storeIdParamSchema, "params"),
  markUnderReview,
);

// Approve — SUPER_ADMIN, ADMIN only
router.patch(
  "/:storeId/approve",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(storeIdParamSchema, "params"),
  validate(approveStoreSchema),
  approveStore,
);

// Reject — SUPER_ADMIN, ADMIN only
router.patch(
  "/:storeId/reject",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(storeIdParamSchema, "params"),
  validate(rejectStoreSchema),
  rejectStore,
);

// Suspend — SUPER_ADMIN, ADMIN only
router.patch(
  "/:storeId/suspend",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(storeIdParamSchema, "params"),
  validate(suspendStoreSchema),
  suspendStore,
);

// Unsuspend — SUPER_ADMIN, ADMIN only
router.patch(
  "/:storeId/unsuspend",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(storeIdParamSchema, "params"),
  unsuspendStore,
);

export default router;
