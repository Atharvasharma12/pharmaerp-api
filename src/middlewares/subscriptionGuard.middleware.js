import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import subscriptionRepository from "../modules/subscription/subscriptions/repositories/subscription.repository.js";

import {
  isSubscriptionActive,
  isSubscriptionExpired,
} from "../utils/subscription/isSubscriptionActive.js";

const getWorkspaceIdFromRequest = (req) => {
  return (
    req.workspaceId ||
    req.headers["x-workspace-id"] ||
    req.params.workspaceId ||
    req.query.workspaceId ||
    req.body.workspaceId ||
    null
  );
};

const subscriptionGuardMiddleware = asyncHandler(async (req, res, next) => {
  const workspaceId = getWorkspaceIdFromRequest(req);

  if (!workspaceId) {
    throw new ApiError(400, "Workspace id is required");
  }

  const subscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(
      workspaceId,
      {
        populate: "planId workspaceId",
      },
    );

  if (!subscription) {
    throw new ApiError(403, "Workspace does not have an active subscription");
  }

  if (isSubscriptionExpired(subscription)) {
    throw new ApiError(403, "Workspace subscription has expired");
  }

  if (!isSubscriptionActive(subscription)) {
    throw new ApiError(403, "Workspace subscription is inactive");
  }

  req.subscription = subscription;
  req.subscriptionId = subscription._id.toString();

  req.subscriptionPlan = subscription.currentPlanSnapshot || null;
  req.subscriptionModules = subscription.currentPlanSnapshot?.modules || [];

  req.subscriptionSeatQuantity = subscription.seatQuantity || 0;
  req.subscriptionActiveSeatCount = subscription.activeSeatCount || 0;

  req.subscriptionSeatInfo = {
    seatQuantity: subscription.seatQuantity || 0,
    activeSeatCount: subscription.activeSeatCount || 0,
  };

  next();
});

export default subscriptionGuardMiddleware;
