import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

import subscriptionService from "../services/subscription.service.js";
import renewalService from "../services/renewal.service.js";
import upgradeService from "../services/upgrade.service.js";
import downgradeService from "../services/downgrade.service.js";
import seatService from "../services/seat.service.js";

export const purchaseSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.purchaseSubscription(
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Subscription purchased successfully", subscription),
    );
});

export const startTrialSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.startTrialSubscription(
    req.user._id,
    req.body,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "Trial subscription started successfully",
        subscription,
      ),
    );
});

export const renewSubscription = asyncHandler(async (req, res) => {
  const subscription = await renewalService.renewSubscription(
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription renewed successfully", subscription),
    );
});

export const upgradeSubscription = asyncHandler(async (req, res) => {
  const subscription = await upgradeService.upgradeSubscription(
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription upgraded successfully", subscription),
    );
});

export const scheduleDowngrade = asyncHandler(async (req, res) => {
  const subscription = await downgradeService.scheduleDowngrade(
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Subscription downgrade scheduled successfully",
        subscription,
      ),
    );
});

export const updateSeatQuantity = asyncHandler(async (req, res) => {
  const subscription = await seatService.updateSeatQuantity(
    req.user._id,
    req.body,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Subscription seats updated successfully",
        subscription,
      ),
    );
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.cancelSubscription(
    req.body.subscriptionId,
    req.user._id,
    req.body.reason,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription cancelled successfully", subscription),
    );
});

export const getSubscriptionById = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getSubscriptionById(
    req.params.subscriptionId,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Subscription fetched successfully", subscription),
    );
});

export const getWorkspaceCurrentSubscription = asyncHandler(
  async (req, res) => {
    const subscription =
      await subscriptionService.getWorkspaceCurrentSubscription(
        req.params.workspaceId,
        req.user._id,
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Workspace subscription fetched successfully",
          subscription,
        ),
      );
  },
);

export const getWorkspaceSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await subscriptionService.getWorkspaceSubscriptions(
    req.params.workspaceId,
    req.user._id,
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
});

export const syncActiveSeatCount = asyncHandler(async (req, res) => {
  const subscription = await seatService.syncActiveSeatCount(
    req.params.workspaceId,
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Active seat count synced successfully",
        subscription,
      ),
    );
});

export const validateSeatAvailability = asyncHandler(async (req, res) => {
  const result = await seatService.validateSeatAvailability(
    req.params.workspaceId,
    Number(req.query.requestedSeats || 1),
    req.user._id,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Seat availability checked successfully", result),
    );
});
