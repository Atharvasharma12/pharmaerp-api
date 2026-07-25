import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  getMyStorePricing,
  getMyProductPricing,
} from "../controllers/marketplacePricing.controller.js";

import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ "string.pattern.base": "Invalid id" });

const globalProductIdParamSchema = Joi.object({
  globalProductId: objectId.required(),
});

const router = Router();

router.use(authMiddleware);

// Get settlement pricing for all enabled products in the partner's store
router.get("/", getMyStorePricing);

// Get settlement pricing for a specific product (by global product ID)
router.get(
  "/:globalProductId",
  validate(globalProductIdParamSchema, "params"),
  getMyProductPricing,
);

export default router;
