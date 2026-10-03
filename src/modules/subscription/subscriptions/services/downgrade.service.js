import ApiError from "../../../../utils/ApiError.js";

import subscriptionRepository from "../repositories/subscription.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import planRepository from "../../plans/repositories/plan.repository.js";

const scheduleDowngrade = async (userId, payload) => {
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
    throw new ApiError(403, "Only workspace owner can downgrade subscription");
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

  subscription.nextPlanId = newPlan._id;

  subscription.nextSeatQuantity = seatQuantity || subscription.seatQuantity;

  subscription.nextBillingCycle = billingCycle || subscription.billingCycle;

  subscription.downgradeScheduledAt = subscription.expiresAt;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const applyScheduledDowngrades = async () => {
  const subscriptions = await subscriptionRepository.getSubscriptions({
    status: "active",
  });

  const now = new Date();

  for (const subscription of subscriptions) {
    if (!subscription.nextPlanId || !subscription.downgradeScheduledAt) {
      continue;
    }

    if (new Date(subscription.downgradeScheduledAt) > now) {
      continue;
    }

    const newPlan = await planRepository.findPlanById(subscription.nextPlanId);

    if (!newPlan) {
      continue;
    }

    subscription.planId = newPlan._id;

    subscription.currentPlanSnapshot = {
      planCode: newPlan.planCode,
      name: newPlan.name,
      type: newPlan.type,
      pricePerUser: newPlan.pricePerUser,
      billingCycle: newPlan.billingCycle,
      modules: newPlan.modules || [],
      features: newPlan.features || {},
    };

    subscription.pricePerUser = newPlan.pricePerUser;

    subscription.billingCycle =
      subscription.nextBillingCycle || subscription.billingCycle;

    subscription.seatQuantity =
      subscription.nextSeatQuantity || subscription.seatQuantity;

    subscription.nextPlanId = null;

    subscription.nextSeatQuantity = null;

    subscription.nextBillingCycle = null;

    subscription.downgradeScheduledAt = null;

    await subscriptionRepository.saveSubscription(subscription);
  }

  return {
    success: true,
  };
};

export default {
  scheduleDowngrade,
  applyScheduledDowngrades,
};
