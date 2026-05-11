import ApiError from "../../../../utils/ApiError.js";

import subscriptionRepository from "../repositories/subscription.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import calculateSubscriptionAmount from "../../../../utils/subscription/calculateSubscriptionAmount.js";

import checkSeatAvailability from "../../../../utils/subscription/checkSeatAvailability.js";

const updateSeatQuantity = async (userId, payload) => {
  const { subscriptionId, seatQuantity } = payload;

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
    throw new ApiError(403, "Only workspace owner can update seats");
  }

  const activeMembers = await workspaceRepository.countActiveWorkspaceMembers(
    subscription.workspaceId._id,
  );

  const seatCheck = checkSeatAvailability({
    seatQuantity,
    activeUserCount: activeMembers,
    requestedSeats: 0,
  });

  if (!seatCheck.minimumSeatsValid) {
    throw new ApiError(400, "Seat quantity is invalid");
  }

  if (seatQuantity < activeMembers) {
    throw new ApiError(
      400,
      `Seat quantity cannot be less than active members (${activeMembers})`,
    );
  }

  const amountDetails = calculateSubscriptionAmount({
    pricePerUser: subscription.pricePerUser,
    seatQuantity,
    billingCycle: subscription.billingCycle,
  });

  subscription.seatQuantity = seatQuantity;

  subscription.activeSeatCount = activeMembers;

  subscription.subtotalAmount = amountDetails.subtotal;

  subscription.totalAmount = amountDetails.totalAmount;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

const validateSeatAvailability = async (workspaceId, requestedSeats = 1) => {
  const subscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (!subscription) {
    throw new ApiError(403, "Active subscription not found");
  }

  const activeMembers =
    await workspaceRepository.countActiveWorkspaceMembers(workspaceId);

  const seatCheck = checkSeatAvailability({
    seatQuantity: subscription.seatQuantity,
    activeUserCount: activeMembers,
    requestedSeats,
  });

  if (!seatCheck.hasAvailableSeats) {
    throw new ApiError(403, "No available seats in subscription");
  }

  return {
    success: true,
    seatCheck,
    subscription: subscription.toSafeObject(),
  };
};

const syncActiveSeatCount = async (workspaceId) => {
  const subscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (!subscription) {
    return null;
  }

  const activeMembers =
    await workspaceRepository.countActiveWorkspaceMembers(workspaceId);

  subscription.activeSeatCount = activeMembers;

  await subscriptionRepository.saveSubscription(subscription);

  return subscription.toSafeObject();
};

export default {
  updateSeatQuantity,
  validateSeatAvailability,
  syncActiveSeatCount,
};
