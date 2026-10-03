import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import platformSubscriptionService from "../services/platformSubscription.service.js";

export const getPlatformSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions =
    await platformSubscriptionService.getPlatformSubscriptions(req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscriptions fetched successfully", subscriptions),
    );
});

export const getPlatformSubscriptionById = asyncHandler(async (req, res) => {
  const subscription =
    await platformSubscriptionService.getPlatformSubscriptionById(
      req.params.subscriptionId,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription fetched successfully", subscription),
    );
});

export const getPlatformWorkspaceSubscriptions = asyncHandler(
  async (req, res) => {
    const subscriptions =
      await platformSubscriptionService.getPlatformWorkspaceSubscriptions(
        req.params.workspaceId,
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Workspace subscriptions fetched successfully",
          subscriptions,
        ),
      );
  },
);

export const updatePlatformSubscriptionStatus = asyncHandler(
  async (req, res) => {
    const subscription =
      await platformSubscriptionService.updatePlatformSubscriptionStatus(
        req.params.subscriptionId,
        req.body.status,
        req.platformUser,
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Subscription status updated successfully",
          subscription,
        ),
      );
  },
);

export const updatePlatformSubscriptionPaymentStatus = asyncHandler(
  async (req, res) => {
    const subscription =
      await platformSubscriptionService.updatePlatformSubscriptionPaymentStatus(
        req.params.subscriptionId,
        req.body.paymentStatus,
        req.platformUser,
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Subscription payment status updated successfully",
          subscription,
        ),
      );
  },
);

export const renewPlatformSubscription = asyncHandler(async (req, res) => {
  const subscription =
    await platformSubscriptionService.renewPlatformSubscription(
      req.params.subscriptionId,
      req.body,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription renewed successfully", subscription),
    );
});

export const changePlatformSubscriptionPlan = asyncHandler(async (req, res) => {
  const subscription =
    await platformSubscriptionService.changePlatformSubscriptionPlan(
      req.params.subscriptionId,
      req.body,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Subscription plan changed successfully",
        subscription,
      ),
    );
});

export const cancelPlatformSubscription = asyncHandler(async (req, res) => {
  const subscription =
    await platformSubscriptionService.cancelPlatformSubscription(
      req.params.subscriptionId,
      req.body.reason,
      req.platformUser,
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription cancelled successfully", subscription),
    );
});

export const extendPlatformSubscriptionTrial = asyncHandler(
  async (req, res) => {
    const subscription =
      await platformSubscriptionService.extendPlatformSubscriptionTrial(
        req.params.subscriptionId,
        req.body.trialDays,
        req.platformUser,
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Subscription trial extended successfully",
          subscription,
        ),
      );
  },
);

export const deletePlatformSubscription = asyncHandler(async (req, res) => {
  await platformSubscriptionService.deletePlatformSubscription(
    req.params.subscriptionId,
    req.platformUser,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Subscription deleted successfully"));
});
