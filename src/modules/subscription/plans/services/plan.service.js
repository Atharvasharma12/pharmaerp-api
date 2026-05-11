import ApiError from "../../../../utils/ApiError.js";

import planRepository from "../repositories/plan.repository.js";

import { PLAN_STATUS } from "../constants/plan.constant.js";

const createSlug = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const createPlan = async (payload) => {
  const slug = createSlug(payload.name);

  const existingPlan = await planRepository.findPlanBySlug(slug);

  if (existingPlan) {
    throw new ApiError(400, "Plan with this name already exists");
  }

  const plan = await planRepository.createPlan({
    name: payload.name,
    slug,
    type: payload.type,
    description: payload.description,
    pricePerUser: payload.pricePerUser,
    billingCycle: payload.billingCycle,
    modules: payload.modules,
    features: payload.features,
    isPopular: payload.isPopular,
    trialDays: payload.trialDays,
    sortOrder: payload.sortOrder,
    status: payload.status || PLAN_STATUS.ACTIVE,
  });

  return plan.toSafeObject();
};

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

const updatePlan = async (planId, payload) => {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (payload.name && payload.name !== plan.name) {
    const slug = createSlug(payload.name);

    const existingPlan = await planRepository.findPlanBySlug(slug);

    if (existingPlan && existingPlan._id.toString() !== plan._id.toString()) {
      throw new ApiError(400, "Plan with this name already exists");
    }

    plan.slug = slug;
  }

  const allowedFields = [
    "name",
    "type",
    "description",
    "pricePerUser",
    "billingCycle",
    "modules",
    "features",
    "isPopular",
    "trialDays",
    "sortOrder",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      plan[field] = payload[field];
    }
  });

  await planRepository.savePlan(plan);

  return plan.toSafeObject();
};

const deletePlan = async (planId) => {
  const plan = await planRepository.deletePlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return {
    success: true,
  };
};

export default {
  createPlan,
  getPlans,
  getActivePlans,
  getPlanById,
  updatePlan,
  deletePlan,
};
