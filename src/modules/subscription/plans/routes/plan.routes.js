import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";

// Note: Replace platformAuthMiddleware with your actual platform admin auth middleware
// import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";

import {
  getPlans,
  getActivePlans,
  getPlanById,
  createPlan,
  updatePlan,
  archivePlan,
  restorePlan,
  deletePlan,
} from "../controllers/plan.controller.js";

import {
  createPlanSchema,
  updatePlanSchema,
  planIdParamSchema,
} from "../validations/plan.validation.js";

const router = Router();

// ─── Public Routes (no auth needed — workspace users can read plans) ───────────

router.get("/active", getActivePlans);

router.get("/", getPlans);

router.get(
  "/:planId",
  validate(planIdParamSchema, "params"),
  getPlanById,
);

// ─── Admin Routes (platform admin only) ──────────────────────────────────────
// Uncomment the middleware below once your platform admin auth is ready:
// router.use(platformAuthMiddleware);

/**
 * POST /plans
 * Create a new plan.
 * Rule: Only one active plan of each type is allowed.
 */
router.post("/", validate(createPlanSchema), createPlan);

/**
 * PATCH /plans/:planId
 * Update an existing plan — any field including limits (even for free plan).
 */
router.patch(
  "/:planId",
  validate(planIdParamSchema, "params"),
  validate(updatePlanSchema),
  updatePlan,
);

/**
 * PATCH /plans/:planId/archive
 * Archive a plan — removes it from being shown to customers.
 * Existing subscribers are unaffected.
 */
router.patch(
  "/:planId/archive",
  validate(planIdParamSchema, "params"),
  archivePlan,
);

/**
 * PATCH /plans/:planId/restore
 * Restore an archived plan back to active.
 * Rule: Cannot restore if another active plan of same type exists.
 */
router.patch(
  "/:planId/restore",
  validate(planIdParamSchema, "params"),
  restorePlan,
);

/**
 * DELETE /plans/:planId
 * Soft-delete a plan. Cannot be undone.
 */
router.delete(
  "/:planId",
  validate(planIdParamSchema, "params"),
  deletePlan,
);

export default router;
