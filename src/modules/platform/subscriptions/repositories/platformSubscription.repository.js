import mongoose from "mongoose";

import Subscription from "../../../subscription/subscriptions/models/subscription.model.js";

import { SUBSCRIPTION_STATUS } from "../../../subscription/subscriptions/constants/subscription.constant.js";

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

const saveSubscription = async (subscription) => {
  return subscription.save();
};

const softDeleteSubscriptionById = async (
  subscriptionId,
  platformUserId = null,
) => {
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
      deletedBy: platformUserId,
      status: SUBSCRIPTION_STATUS.CANCELLED,
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
  getWorkspaceSubscriptions,
  getSubscriptions,
  saveSubscription,
  softDeleteSubscriptionById,
};
