import ApiError from "../../../../utils/ApiError.js";

import subscriptionRepository from "../repositories/subscription.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import planRepository from "../../plans/repositories/plan.repository.js";

import calculateSubscriptionExpiry from "../../../../utils/subscription/calculateSubscriptionExpiry.js";

import calculateSubscriptionAmount from "../../../../utils/subscription/calculateSubscriptionAmount.js";

import {
  isSubscriptionActive,
  isSubscriptionExpired,
} from "../../../../utils/subscription/isSubscriptionActive.js";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} from "../constants/subscription.constant.js";

const buildPlanSnapshot = (plan) => {
  return {
    planCode: plan.planCode,
    name: plan.name,
    type: plan.type,
    pricePerUser: plan.pricePerUser,
    billingCycle: plan.billingCycle,
    modules: plan.modules || [],
    features: plan.features || {},
  };
};

const purchaseSubscription = async (userId, payload) => {
  const { workspaceId, planId, billingCycle, seatQuantity, currency } = payload;

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new ApiError(404, "Workspace not found");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can purchase subscription");
  }

  const existingSubscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (existingSubscription) {
    throw new ApiError(400, "Workspace already has an active subscription");
  }

  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: plan.pricePerUser,
    seatQuantity,
    billingCycle,
  });

  const startsAt = new Date();

  const expiresAt = calculateSubscriptionExpiry({
    billingCycle,
    startDate: startsAt,
    trialDays: plan.trialDays || 0,
  });

  const isTrial = Boolean(plan.trialDays && plan.trialDays > 0);

  const subscription = await subscriptionRepository.createSubscription({
    workspaceId,
    planId: plan._id,
    purchasedBy: userId,

    currentPlanSnapshot: buildPlanSnapshot(plan),

    billingCycle,
    pricePerUser: plan.pricePerUser,

    seatQuantity,
    activeSeatCount: 1,

    subtotalAmount: amountDetails.subtotal,
    totalAmount: amountDetails.totalAmount,

    currency: currency || "INR",

    status: isTrial ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,

    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.PAID,

    startsAt,
    expiresAt,

    trialEndsAt: isTrial ? expiresAt : null,
  });

  return subscription.toSafeObject();
};

const getSubscriptionById = async (subscriptionId) => {
  const subscription = await subscriptionRepository.findSubscriptionById(
    subscriptionId,
    {
      populate: "workspaceId planId purchasedBy",
    },
  );

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  return subscription.toSafeObject();
};

const getWorkspaceCurrentSubscription = async (workspaceId) => {
  const subscription =
    await subscriptionRepository.findCurrentSubscriptionByWorkspace(
      workspaceId,
      {
        populate: "workspaceId planId purchasedBy",
      },
    );

  if (!subscription) {
    return null;
  }

  return subscription.toSafeObject();
};

const getWorkspaceSubscriptions = async (workspaceId) => {
  const subscriptions = await subscriptionRepository.getWorkspaceSubscriptions(
    workspaceId,
    {
      populate: "workspaceId planId purchasedBy",
    },
  );

  return subscriptions.map((subscription) => subscription.toSafeObject());
};

const getSubscriptions = async (filters = {}) => {
  const subscriptions = await subscriptionRepository.getSubscriptions(filters, {
    populate: "workspaceId planId purchasedBy",
  });

  return subscriptions.map((subscription) => subscription.toSafeObject());
};

const cancelSubscription = async (subscriptionId, userId, reason) => {
  const subscription =
    await subscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    subscription.workspaceId,
    userId,
  );

  if (!member) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can cancel subscription");
  }

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;

  subscription.cancelledAt = new Date();

  subscription.cancelledBy = userId;

  subscription.cancelReason = reason || null;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const markExpiredSubscriptions = async () => {
  return subscriptionRepository.markExpiredSubscriptions();
};

const validateWorkspaceSubscriptionAccess = async (workspaceId) => {
  const subscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (!subscription) {
    throw new ApiError(403, "Workspace does not have an active subscription");
  }

  if (isSubscriptionExpired(subscription)) {
    throw new ApiError(403, "Workspace subscription has expired");
  }

  if (!isSubscriptionActive(subscription)) {
    throw new ApiError(403, "Workspace subscription is inactive");
  }

  return subscription;
};

export default {
  purchaseSubscription,
  getSubscriptionById,
  getWorkspaceCurrentSubscription,
  getWorkspaceSubscriptions,
  getSubscriptions,
  cancelSubscription,
  markExpiredSubscriptions,
  validateWorkspaceSubscriptionAccess,
};
