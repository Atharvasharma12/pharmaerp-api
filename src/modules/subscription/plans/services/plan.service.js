import ApiError from "../../../../utils/ApiError.js";

import planRepository from "../repositories/plan.repository.js";

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

export default {
  getPlans,
  getActivePlans,
  getPlanById,
};
