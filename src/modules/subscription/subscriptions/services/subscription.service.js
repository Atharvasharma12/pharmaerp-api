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

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
};

const validateWorkspaceAccess = async (workspaceId, userId) => {
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

  return member;
};

const validateWorkspaceOwner = async (workspaceId, userId) => {
  const member = await validateWorkspaceAccess(workspaceId, userId);

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can perform this action");
  }

  return member;
};

const purchaseSubscription = async (userId, payload) => {
  const { workspaceId, planId, billingCycle, seatQuantity, currency } = payload;

  await validateWorkspaceOwner(workspaceId, userId);

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
    trialDays: 0,
  });

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

    status: SUBSCRIPTION_STATUS.ACTIVE,

    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.PAID,

    startsAt,
    expiresAt,

    trialEndsAt: null,
    trialUsed: false,
    trialStartedAt: null,
    trialPlanId: null,
  });

  return subscription.toSafeObject();
};

const startTrialSubscription = async (userId, payload) => {
  const { workspaceId, planId, seatQuantity = 1 } = payload;

  await validateWorkspaceOwner(workspaceId, userId);

  const existingSubscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (existingSubscription) {
    throw new ApiError(400, "Workspace already has an active subscription");
  }

  const usedTrial =
    await subscriptionRepository.findTrialUsedByWorkspace(workspaceId);

  if (usedTrial) {
    throw new ApiError(400, "Trial already used for this workspace");
  }

  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (!plan.trialDays || plan.trialDays <= 0) {
    throw new ApiError(400, "This plan does not have trial days");
  }

  const startsAt = new Date();
  const expiresAt = addDays(startsAt, plan.trialDays);

  const subscription = await subscriptionRepository.createSubscription({
    workspaceId,
    planId: plan._id,
    purchasedBy: userId,

    currentPlanSnapshot: buildPlanSnapshot(plan),

    billingCycle: plan.billingCycle,
    pricePerUser: plan.pricePerUser,

    seatQuantity,
    activeSeatCount: 1,

    subtotalAmount: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,

    currency: "INR",

    status: SUBSCRIPTION_STATUS.TRIAL,

    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.PAID,

    startsAt,
    expiresAt,

    trialEndsAt: expiresAt,
    trialUsed: true,
    trialStartedAt: startsAt,
    trialPlanId: plan._id,
  });

  return subscription.toSafeObject();
};

const getSubscriptionById = async (subscriptionId, userId) => {
  const subscription = await subscriptionRepository.findSubscriptionById(
    subscriptionId,
    {
      populate: "workspaceId planId purchasedBy",
    },
  );

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  await validateWorkspaceAccess(subscription.workspaceId._id, userId);

  return subscription.toSafeObject();
};

const getWorkspaceCurrentSubscription = async (workspaceId, userId) => {
  await validateWorkspaceAccess(workspaceId, userId);

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

const getWorkspaceSubscriptions = async (workspaceId, userId) => {
  await validateWorkspaceAccess(workspaceId, userId);

  const subscriptions = await subscriptionRepository.getWorkspaceSubscriptions(
    workspaceId,
    {
      populate: "workspaceId planId purchasedBy",
    },
  );

  return subscriptions.map((subscription) => subscription.toSafeObject());
};

const cancelSubscription = async (subscriptionId, userId, reason) => {
  const subscription =
    await subscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  await validateWorkspaceOwner(subscription.workspaceId, userId);

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
  startTrialSubscription,
  getSubscriptionById,
  getWorkspaceCurrentSubscription,
  getWorkspaceSubscriptions,
  cancelSubscription,
  markExpiredSubscriptions,
  validateWorkspaceSubscriptionAccess,
};
