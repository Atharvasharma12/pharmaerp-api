import ApiError from "../../../../utils/ApiError.js";

import subscriptionRepository from "../repositories/subscription.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import calculateSubscriptionExpiry from "../../../../utils/subscription/calculateSubscriptionExpiry.js";

import calculateSubscriptionAmount from "../../../../utils/subscription/calculateSubscriptionAmount.js";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} from "../constants/subscription.constant.js";

const renewSubscription = async (userId, payload) => {
  const { subscriptionId, billingCycle, seatQuantity } = payload;

  const subscription = await subscriptionRepository.findSubscriptionById(
    subscriptionId,
    {
      populate: "planId workspaceId",
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
    throw new ApiError(403, "Only workspace owner can renew subscription");
  }

  const plan = subscription.planId;

  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const nextBillingCycle = billingCycle || subscription.billingCycle;

  const nextSeatQuantity = seatQuantity || subscription.seatQuantity;

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: plan.pricePerUser,
    seatQuantity: nextSeatQuantity,
    billingCycle: nextBillingCycle,
  });

  const startsAt = new Date();

  const expiresAt = calculateSubscriptionExpiry({
    billingCycle: nextBillingCycle,
    startDate: startsAt,
  });

  subscription.billingCycle = nextBillingCycle;

  subscription.pricePerUser = plan.pricePerUser;

  subscription.seatQuantity = nextSeatQuantity;

  subscription.subtotalAmount = amountDetails.subtotal;

  subscription.totalAmount = amountDetails.totalAmount;

  subscription.startsAt = startsAt;

  subscription.expiresAt = expiresAt;

  subscription.renewedAt = new Date();

  subscription.status = SUBSCRIPTION_STATUS.ACTIVE;

  subscription.paymentStatus = SUBSCRIPTION_PAYMENT_STATUS.PAID;

  subscription.cancelledAt = null;

  subscription.cancelledBy = null;

  subscription.cancelReason = null;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

export default {
  renewSubscription,
};
