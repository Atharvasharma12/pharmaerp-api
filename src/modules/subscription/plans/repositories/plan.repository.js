import mongoose from "mongoose";

import Plan from "../models/plan.model.js";

import { PLAN_STATUS } from "../constants/plan.constant.js";

const findPlanById = async (planId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return null;
  }

  return Plan.findOne({
    _id: planId,
    isDeleted: false,
  }).select(options.select || "");
};

const findPlanBySlug = async (slug, options = {}) => {
  return Plan.findOne({
    slug: String(slug).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findPlanByCode = async (planCode, options = {}) => {
  return Plan.findOne({
    planCode: String(planCode).trim().toUpperCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const createPlan = async (payload) => {
  return Plan.create(payload);
};

const savePlan = async (plan) => {
  return plan.save();
};

const getPlans = async (filters = {}, options = {}) => {
  const query = {
    isDeleted: false,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  return Plan.find(query)
    .sort(options.sort || { sortOrder: 1, createdAt: 1 })
    .select(options.select || "");
};

const getActivePlans = async (options = {}) => {
  return Plan.find({
    status: PLAN_STATUS.ACTIVE,
    isDeleted: false,
  })
    .sort(options.sort || { sortOrder: 1, createdAt: 1 })
    .select(options.select || "");
};

const deletePlanById = async (planId) => {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return null;
  }

  return Plan.findOneAndUpdate(
    {
      _id: planId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      status: PLAN_STATUS.ARCHIVED,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  findPlanById,
  findPlanBySlug,
  findPlanByCode,
  createPlan,
  savePlan,
  getPlans,
  getActivePlans,
  deletePlanById,
};
