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

const findTrialUsedByWorkspace = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Subscription.findOne({
    workspaceId,
    isDeleted: false,
    trialUsed: true,
  })
    .sort({ createdAt: -1 })
    .populate(options.populate || "")
    .select(options.select || "");
};

const getWorkspaceSeatLimit = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  const subscription = await Subscription.findOne({
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
    .select("seatQuantity");

  return subscription?.seatQuantity || 0;
};

const getWorkspaceSubscriptionSeatInfo = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  const subscription = await Subscription.findOne({
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
    .select(
      "subscriptionCode workspaceId planId seatQuantity activeSeatCount status expiresAt",
    );

  if (!subscription) {
    return null;
  }

  return {
    subscriptionId: subscription._id,
    subscriptionCode: subscription.subscriptionCode,
    workspaceId: subscription.workspaceId,
    planId: subscription.planId,
    seatQuantity: subscription.seatQuantity,
    activeSeatCount: subscription.activeSeatCount,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
  };
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

export default {
  findSubscriptionById,
  findSubscriptionByCode,
  findCurrentSubscriptionByWorkspace,
  findActiveSubscriptionByWorkspace,
  findTrialUsedByWorkspace,

  getWorkspaceSeatLimit,
  getWorkspaceSubscriptionSeatInfo,

  createSubscription,
  saveSubscription,
  getWorkspaceSubscriptions,
  markExpiredSubscriptions,
};
