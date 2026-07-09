import ApiError from "../../../../utils/ApiError.js";

import subscriptionRepository from "../repositories/subscription.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import planRepository from "../../plans/repositories/plan.repository.js";

import calculateSubscriptionAmount from "../../../../utils/subscription/calculateSubscriptionAmount.js";

import calculateSubscriptionExpiry from "../../../../utils/subscription/calculateSubscriptionExpiry.js";

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

const upgradeSubscription = async (userId, payload) => {
  const { subscriptionId, newPlanId, billingCycle, seatQuantity } = payload;

  const subscription = await subscriptionRepository.findSubscriptionById(
    subscriptionId,
    {
      populate: "workspaceId planId",
    },
  );

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const member = await workspaceRepository.findWorkspaceMember(
    subscription.workspaceId._id,
    userId,
  );

  if (!member) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can upgrade subscription");
  }

  const newPlan = await planRepository.findPlanById(newPlanId);

  if (!newPlan) {
    throw new ApiError(404, "New plan not found");
  }

  if (
    subscription.planId &&
    subscription.planId._id.toString() === newPlan._id.toString()
  ) {
    throw new ApiError(400, "Subscription is already using this plan");
  }

  const PLAN_TIER_ORDER = {
    free: 1,
    starter: 2,
    business: 3,
    enterprise: 4,
  };

  const currentPlanType = subscription.currentPlanSnapshot?.type || subscription.planId?.type || "free";
  const currentWeight = PLAN_TIER_ORDER[currentPlanType] || 1;
  const newWeight = PLAN_TIER_ORDER[newPlan.type] || 1;

  if (newWeight <= currentWeight) {
    throw new ApiError(400, "You can only upgrade to a higher tier plan.");
  }

  const nextBillingCycle = billingCycle || subscription.billingCycle;

  const nextSeatQuantity = seatQuantity || subscription.seatQuantity;

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: newPlan.pricePerUser,
    seatQuantity: nextSeatQuantity,
    billingCycle: nextBillingCycle,
  });

  subscription.planId = newPlan._id;

  subscription.currentPlanSnapshot = buildPlanSnapshot(newPlan);

  subscription.billingCycle = nextBillingCycle;

  subscription.pricePerUser = newPlan.pricePerUser;

  subscription.seatQuantity = nextSeatQuantity;

  subscription.subtotalAmount = amountDetails.subtotal;

  subscription.totalAmount = amountDetails.totalAmount;

  const startsAt = new Date();

  subscription.startsAt = startsAt;
  subscription.expiresAt = calculateSubscriptionExpiry({
    billingCycle: nextBillingCycle,
    startDate: startsAt,
    trialDays: 0,
  });

  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;

  subscription.paymentStatus = SUBSCRIPTION_PAYMENT_STATUS.PAID;

  subscription.nextPlanId = null;

  subscription.nextSeatQuantity = null;

  subscription.nextBillingCycle = null;

  subscription.downgradeScheduledAt = null;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

export default {
  upgradeSubscription,
};
