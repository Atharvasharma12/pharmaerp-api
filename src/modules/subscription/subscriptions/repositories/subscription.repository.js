import mongoose from "mongoose";

import Subscription from "../models/subscription.model.js";

import { SUBSCRIPTION_STATUS } from "../constants/subscription.constant.js";

const findSubscriptionById = async (subscriptionId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    return null;
  }

  return Subscription.findOne({
    _id: subscriptionId,
    isDeleted: false,
  })
    .populate(options.populate || "")
    .select(options.select || "");
};

const findSubscriptionByCode = async (subscriptionCode, options = {}) => {
  return Subscription.findOne({
    subscriptionCode: String(subscriptionCode).trim().toUpperCase(),
    isDeleted: false,
  })
    .populate(options.populate || "")
    .select(options.select || "");
};

const findCurrentSubscriptionByWorkspace = async (
  workspaceId,
  options = {},
) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Subscription.findOne({
    workspaceId,
    isDeleted: false,
    status: {
      $in: [
        SUBSCRIPTION_STATUS.TRIAL,
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.EXPIRED,
        SUBSCRIPTION_STATUS.SUSPENDED,
      ],
    },
  })
    .sort({ createdAt: -1 })
    .populate(options.populate || "")
    .select(options.select || "");
};

const findActiveSubscriptionByWorkspace = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Subscription.findOne({
    workspaceId,
    isDeleted: false,
    status: {
      $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE],
    },
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({ createdAt: -1 })
    .populate(options.populate || "")
    .select(options.select || "");
};

const createSubscription = async (payload) => {
  return Subscription.create(payload);
};

const saveSubscription = async (subscription) => {
  return subscription.save();
};

const getWorkspaceSubscriptions = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return Subscription.find({
    workspaceId,
    isDeleted: false,
  })
    .sort(options.sort || { createdAt: -1 })
    .populate(options.populate || "")
    .select(options.select || "");
};

const getSubscriptions = async (filters = {}, options = {}) => {
  const query = {
    isDeleted: false,
  };

  if (
    filters.workspaceId &&
    mongoose.Types.ObjectId.isValid(filters.workspaceId)
  ) {
    query.workspaceId = filters.workspaceId;
  }

  if (filters.planId && mongoose.Types.ObjectId.isValid(filters.planId)) {
    query.planId = filters.planId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.billingCycle) {
    query.billingCycle = filters.billingCycle;
  }

  return Subscription.find(query)
    .sort(options.sort || { createdAt: -1 })
    .populate(options.populate || "")
    .select(options.select || "");
};

const markExpiredSubscriptions = async () => {
  return Subscription.updateMany(
    {
      isDeleted: false,
      status: {
        $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE],
      },
      expiresAt: {
        $lte: new Date(),
      },
    },
    {
      status: SUBSCRIPTION_STATUS.EXPIRED,
    },
  );
};

const deleteSubscriptionById = async (subscriptionId, deletedBy) => {
  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    return null;
  }

  return Subscription.findOneAndUpdate(
    {
      _id: subscriptionId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  findSubscriptionById,
  findSubscriptionByCode,
  findCurrentSubscriptionByWorkspace,
  findActiveSubscriptionByWorkspace,
  createSubscription,
  saveSubscription,
  getWorkspaceSubscriptions,
  getSubscriptions,
  markExpiredSubscriptions,
  deleteSubscriptionById,
};
