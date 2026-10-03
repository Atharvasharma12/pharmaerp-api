import ApiError from "../../../../utils/ApiError.js";

import planRepository from "../repositories/plan.repository.js";

import { PLAN_STATUS } from "../constants/plan.constant.js";

// ─── Read ─────────────────────────────────────────────────────────────────────

const getPlans = async (filters = {}) => {
  const plans = await planRepository.getPlans(filters);

  return plans.map((plan) => plan.toSafeObject());
};

const getActivePlans = async () => {
  const plans = await planRepository.getActivePlans();

  return plans.map((plan) => plan.toSafeObject());
};

const getPlanById = async (planId) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return plan.toSafeObject();
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new plan.
 * Rule: Only one active plan of each type is allowed at a time.
 * Admin must deactivate/archive the existing plan of that type first.
 */
const createPlan = async (payload) => {
  const { type } = payload;

  // Check if an active plan of this type already exists
  const existingActivePlan = await planRepository.findActivePlanByType(type);

  if (existingActivePlan) {
    throw new ApiError(
      409,
      `An active "${type}" plan already exists (${existingActivePlan.name}). Archive or deactivate it before creating a new one.`,
    );
  }

  const plan = await planRepository.createPlan(payload);

  return plan.toSafeObject();
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing plan.
 * Admin can update anything including limits (even on free plan).
 * Rule: Cannot change type to one that already has another active plan.
 */
const updatePlan = async (planId, payload) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (plan.isDeleted) {
    throw new ApiError(400, "Cannot update a deleted plan");
  }

  // If type is being changed, ensure no other active plan of that type exists
  if (payload.type && payload.type !== plan.type) {
    const conflicting = await planRepository.findActivePlanByType(
      payload.type,
      planId,
    );

    if (conflicting) {
      throw new ApiError(
        409,
        `An active "${payload.type}" plan already exists (${conflicting.name}). You cannot change this plan's type to "${payload.type}".`,
      );
    }
  }

  // Apply allowed updates
  const allowed = [
    "name",
    "description",
    "type",
    "pricePerUser",
    "billingCycle",
    "modules",
    "features",
    "limits",       // Admin can update limits on any plan including free
    "featureItems",
    "isPopular",
    "status",
    "sortOrder",
  ];

  allowed.forEach((key) => {
    if (payload[key] !== undefined) {
      plan[key] = payload[key];
    }
  });

  plan.updatedBy = payload.updatedBy || null;

  await planRepository.savePlan(plan);

  return plan.toSafeObject();
};

// ─── Archive / Status ─────────────────────────────────────────────────────────

/**
 * Archive a plan (soft deactivate). Archived plans cannot be purchased/upgraded to.
 * Existing subscribers are unaffected.
 */
const archivePlan = async (planId, adminUserId) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (plan.isDeleted) {
    throw new ApiError(400, "Plan is already deleted");
  }

  if (plan.status === PLAN_STATUS.ARCHIVED) {
    throw new ApiError(400, "Plan is already archived");
  }

  plan.status = PLAN_STATUS.ARCHIVED;
  plan.updatedBy = adminUserId || null;

  await planRepository.savePlan(plan);

  return plan.toSafeObject();
};

/**
 * Restore an archived plan back to active.
 * Rule: Cannot reactivate if another active plan of same type exists.
 */
const restorePlan = async (planId, adminUserId) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (plan.status === PLAN_STATUS.ACTIVE) {
    throw new ApiError(400, "Plan is already active");
  }

  // Before restoring, check if another active plan of same type exists
  const conflict = await planRepository.findActivePlanByType(plan.type, planId);

  if (conflict) {
    throw new ApiError(
      409,
      `An active "${plan.type}" plan already exists (${conflict.name}). Archive it first before restoring this plan.`,
    );
  }

  plan.status = PLAN_STATUS.ACTIVE;
  plan.updatedBy = adminUserId || null;

  await planRepository.savePlan(plan);

  return plan.toSafeObject();
};

/**
 * Soft-delete a plan. Cannot be undone.
 */
const deletePlan = async (planId, adminUserId) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (plan.isDeleted) {
    throw new ApiError(400, "Plan is already deleted");
  }

  plan.isDeleted = true;
  plan.deletedAt = new Date();
  plan.deletedBy = adminUserId || null;
  plan.status = PLAN_STATUS.ARCHIVED;

  await planRepository.savePlan(plan);

  return { success: true };
};

export default {
  getPlans,
  getActivePlans,
  getPlanById,
  createPlan,
  updatePlan,
  archivePlan,
  restorePlan,
  deletePlan,
};
