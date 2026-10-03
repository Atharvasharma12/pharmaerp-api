import { SUBSCRIPTION_STATUS } from "../../modules/subscription/subscriptions/constants/subscription.constant.js";

export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;

  const now = new Date();

  return (
    subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
    subscription.expiresAt &&
    new Date(subscription.expiresAt) > now
  );
};

export const isSubscriptionExpired = (subscription) => {
  if (!subscription) return true;

  if (subscription.status === SUBSCRIPTION_STATUS.EXPIRED) {
    return true;
  }

  if (!subscription.expiresAt) {
    return true;
  }

  return new Date(subscription.expiresAt) <= new Date();
};

export const isSubscriptionReadOnly = (subscription) => {
  return isSubscriptionExpired(subscription);
};

export default {
  isSubscriptionActive,
  isSubscriptionExpired,
  isSubscriptionReadOnly,
};
