import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  setPricing,
  getAllPricing,
  getPricingById,
  getPricingByGlobalProduct,
  updatePricingStatus,
  deletePricing,
} from "../controllers/platformPricing.controller.js";

import {
  setPricingSchema,
  updatePricingStatusSchema,
  pricingIdParamSchema,
  globalProductIdParamSchema,
  getAllPricingQuerySchema,
} from "../validations/platformPricing.validation.js";

const router = Router();

router.use(platformAuthMiddleware);

// Set pricing for a global product (create or update) — ADMIN / CATALOG_MANAGER
router.post(
  "/",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.CATALOG_MANAGER,
  ),
  validate(setPricingSchema),
  setPricing,
);

// Get all platform pricing records
router.get(
  "/",
  validate(getAllPricingQuerySchema, "query"),
  getAllPricing,
);

// Get pricing by global product ID
router.get(
  "/by-product/:globalProductId",
  validate(globalProductIdParamSchema, "params"),
  getPricingByGlobalProduct,
);

// Get single pricing record
router.get(
  "/:pricingId",
  validate(pricingIdParamSchema, "params"),
  getPricingById,
);

// Update status — ADMIN / CATALOG_MANAGER
router.patch(
  "/:pricingId/status",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.CATALOG_MANAGER,
  ),
  validate(pricingIdParamSchema, "params"),
  validate(updatePricingStatusSchema),
  updatePricingStatus,
);

// Delete — SUPER_ADMIN / ADMIN only
router.delete(
  "/:pricingId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(pricingIdParamSchema, "params"),
  deletePricing,
);

export default router;
