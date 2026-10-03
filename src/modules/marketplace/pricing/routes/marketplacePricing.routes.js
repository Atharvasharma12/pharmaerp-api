import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  getMyStorePricing,
  getMyProductPricing,
  getAvailablePricingCatalog,
} from "../controllers/marketplacePricing.controller.js";

import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid id" });

const globalProductIdParamSchema = Joi.object({
  globalProductId: objectId.required(),
});

const catalogQuerySchema = Joi.object({
  search: Joi.string().trim().max(200).optional().allow(""),

  productType: Joi.string()
    .valid("medicine", "otc", "device", "other")
    .optional(),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(20),
});

const router = Router();

router.use(authMiddleware);

// ── Catalog Browse (before /:globalProductId to avoid param conflict) ─────────
// Returns ALL platform-priced products (with customerPrice visible) so partners
// can browse and decide what to enable in their store.
router.get(
  "/catalog",
  validate(catalogQuerySchema, "query"),
  getAvailablePricingCatalog,
);

// ── My Store Pricing ──────────────────────────────────────────────────────────
// Get settlement pricing for all products the partner has already enabled
router.get("/", getMyStorePricing);

// Get settlement pricing for a specific already-enabled product
router.get(
  "/:globalProductId",
  validate(globalProductIdParamSchema, "params"),
  getMyProductPricing,
);

export default router;
