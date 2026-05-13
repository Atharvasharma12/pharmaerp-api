import ApiError from "../../../../utils/ApiError.js";

import platformPlanRepository from "../repositories/platformPlan.repository.js";

import { PLAN_STATUS } from "../../../subscription/plans/constants/plan.constant.js";

const createSlug = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

const createPlatformPlan = async (payload, platformUser) => {
  const slug = createSlug(payload.name);

  const existingPlan = await platformPlanRepository.findPlanBySlug(slug);

  if (existingPlan) {
    throw new ApiError(400, "Plan with this name already exists");
  }

  const platformUserId = getPlatformUserId(platformUser);

  const plan = await platformPlanRepository.createPlan({
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
    createdBy: platformUserId,
    updatedBy: platformUserId,
  });

  return plan.toSafeObject();
};

const getPlatformPlans = async (filters = {}) => {
  const plans = await platformPlanRepository.getPlans(filters);

  return plans.map((plan) => plan.toSafeObject());
};

const getPlatformPlanById = async (planId) => {
  const plan = await platformPlanRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return plan.toSafeObject();
};

const updatePlatformPlan = async (planId, payload, platformUser) => {
  const plan = await platformPlanRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (payload.name && payload.name !== plan.name) {
    const slug = createSlug(payload.name);

    const existingPlan = await platformPlanRepository.findPlanBySlug(slug);

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

  plan.updatedBy = getPlatformUserId(platformUser);

  await platformPlanRepository.savePlan(plan);

  return plan.toSafeObject();
};

const deletePlatformPlan = async (planId, platformUser) => {
  const plan = await platformPlanRepository.softDeletePlanById(
    planId,
    getPlatformUserId(platformUser),
  );

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  return {
    success: true,
  };
};

export default {
  createPlatformPlan,
  getPlatformPlans,
  getPlatformPlanById,
  updatePlatformPlan,
  deletePlatformPlan,
};
