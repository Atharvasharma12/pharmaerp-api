import ApiError from "../../../../utils/ApiError.js";

import platformSubscriptionRepository from "../repositories/platformSubscription.repository.js";

import planRepository from "../../../subscription/plans/repositories/plan.repository.js";

import calculateSubscriptionExpiry from "../../../../utils/subscription/calculateSubscriptionExpiry.js";
import calculateSubscriptionAmount from "../../../../utils/subscription/calculateSubscriptionAmount.js";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
  SUBSCRIPTION_BILLING_CYCLE,
} from "../../../subscription/subscriptions/constants/subscription.constant.js";

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

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

const setPlatformMeta = (subscription, platformUser, action) => {
  subscription.meta = {
    ...(subscription.meta || {}),
    platform: {
      ...((subscription.meta && subscription.meta.platform) || {}),
      lastAction: action,
      lastUpdatedBy: getPlatformUserId(platformUser),
      lastUpdatedAt: new Date(),
    },
  };
};

const getPlatformSubscriptions = async (filters = {}) => {
  const subscriptions = await platformSubscriptionRepository.getSubscriptions(
    filters,
    {
      populate: "workspaceId planId purchasedBy",
    },
  );

  return subscriptions.map((subscription) => subscription.toSafeObject());
};

const getPlatformSubscriptionById = async (subscriptionId) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId, {
      populate: "workspaceId planId purchasedBy",
    });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  return subscription.toSafeObject();
};

const getPlatformWorkspaceSubscriptions = async (workspaceId) => {
  const subscriptions =
    await platformSubscriptionRepository.getWorkspaceSubscriptions(
      workspaceId,
      {
        populate: "workspaceId planId purchasedBy",
      },
    );

  return subscriptions.map((subscription) => subscription.toSafeObject());
};

const updatePlatformSubscriptionStatus = async (
  subscriptionId,
  status,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  subscription.status = status;

  if (status === SUBSCRIPTION_STATUS.CANCELLED) {
    subscription.cancelledAt = new Date();
    subscription.cancelledBy = getPlatformUserId(platformUser);
  }

  setPlatformMeta(subscription, platformUser, "STATUS_UPDATED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const updatePlatformSubscriptionPaymentStatus = async (
  subscriptionId,
  paymentStatus,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  subscription.paymentStatus = paymentStatus;

  setPlatformMeta(subscription, platformUser, "PAYMENT_STATUS_UPDATED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const renewPlatformSubscription = async (
  subscriptionId,
  payload,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const plan = await planRepository.findPlanById(subscription.planId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const billingCycle = payload.billingCycle || subscription.billingCycle;
  const seatQuantity = payload.seatQuantity || subscription.seatQuantity;

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: plan.pricePerUser,
    seatQuantity,
    billingCycle,
  });

  const renewedAt = new Date();

  const expiresAt = calculateSubscriptionExpiry({
    billingCycle,
    startDate: renewedAt,
    trialDays: 0,
  });

  subscription.billingCycle = billingCycle;
  subscription.pricePerUser = plan.pricePerUser;
  subscription.seatQuantity = seatQuantity;

  subscription.subtotalAmount = amountDetails.subtotal;
  subscription.totalAmount = amountDetails.totalAmount;

  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
  subscription.paymentStatus = SUBSCRIPTION_PAYMENT_STATUS.PAID;

  subscription.renewedAt = renewedAt;
  subscription.expiresAt = expiresAt;
  subscription.trialEndsAt = null;

  subscription.currentPlanSnapshot = buildPlanSnapshot(plan);

  setPlatformMeta(subscription, platformUser, "RENEWED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const changePlatformSubscriptionPlan = async (
  subscriptionId,
  payload,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const plan = await planRepository.findPlanById(payload.newPlanId);

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const billingCycle = payload.billingCycle || subscription.billingCycle;
  const seatQuantity = payload.seatQuantity || subscription.seatQuantity;

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: plan.pricePerUser,
    seatQuantity,
    billingCycle,
  });

  subscription.planId = plan._id;
  subscription.currentPlanSnapshot = buildPlanSnapshot(plan);

  subscription.billingCycle = billingCycle;
  subscription.pricePerUser = plan.pricePerUser;
  subscription.seatQuantity = seatQuantity;

  subscription.subtotalAmount = amountDetails.subtotal;
  subscription.totalAmount = amountDetails.totalAmount;

  subscription.nextPlanId = null;
  subscription.nextSeatQuantity = null;
  subscription.nextBillingCycle = null;
  subscription.downgradeScheduledAt = null;

  setPlatformMeta(subscription, platformUser, "PLAN_CHANGED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const cancelPlatformSubscription = async (
  subscriptionId,
  reason,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancelledAt = new Date();
  subscription.cancelledBy = getPlatformUserId(platformUser);
  subscription.cancelReason = reason || null;

  setPlatformMeta(subscription, platformUser, "CANCELLED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const extendPlatformSubscriptionTrial = async (
  subscriptionId,
  trialDays,
  platformUser,
) => {
  const subscription =
    await platformSubscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const baseDate =
    subscription.trialEndsAt && subscription.trialEndsAt > new Date()
      ? subscription.trialEndsAt
      : new Date();

  const trialEndsAt = new Date(baseDate);
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  subscription.status = SUBSCRIPTION_STATUS.TRIAL;
  subscription.trialEndsAt = trialEndsAt;
  subscription.expiresAt = trialEndsAt;

  if (!subscription.billingCycle) {
    subscription.billingCycle = SUBSCRIPTION_BILLING_CYCLE.MONTHLY;
  }

  setPlatformMeta(subscription, platformUser, "TRIAL_EXTENDED");

  await platformSubscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const deletePlatformSubscription = async (subscriptionId, platformUser) => {
  const subscription =
    await platformSubscriptionRepository.softDeleteSubscriptionById(
      subscriptionId,
      getPlatformUserId(platformUser),
    );

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  return {
    success: true,
  };
};

export default {
  getPlatformSubscriptions,
  getPlatformSubscriptionById,
  getPlatformWorkspaceSubscriptions,
  updatePlatformSubscriptionStatus,
  updatePlatformSubscriptionPaymentStatus,
  renewPlatformSubscription,
  changePlatformSubscriptionPlan,
  cancelPlatformSubscription,
  extendPlatformSubscriptionTrial,
  deletePlatformSubscription,
};
