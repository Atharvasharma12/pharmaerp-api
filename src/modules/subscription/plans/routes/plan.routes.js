import { Router } from "express";

import {
  getPlans,
  getActivePlans,
  getPlanById,
} from "../controllers/plan.controller.js";

const router = Router();

// public read-only routes
router.get("/active", getActivePlans);

router.get("/", getPlans);

router.get("/:planId", getPlanById);

export default router;
