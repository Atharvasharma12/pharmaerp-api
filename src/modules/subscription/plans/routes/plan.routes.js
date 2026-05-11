import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  createPlan,
  getPlans,
  getActivePlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../controllers/plan.controller.js";

import {
  createPlanSchema,
  updatePlanSchema,
} from "../validations/plan.validation.js";

const router = Router();

// public
router.get("/active", getActivePlans);

// protected
router.use(authMiddleware);

router.post("/", validate(createPlanSchema), createPlan);

router.get("/", getPlans);

router.get("/:planId", getPlanById);

router.patch("/:planId", validate(updatePlanSchema), updatePlan);

router.delete("/:planId", deletePlan);

export default router;
