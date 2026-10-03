import { SUBSCRIPTION_BILLING_CYCLE } from "../../modules/subscription/subscriptions/constants/subscription.constant.js";

const calculateSubscriptionExpiry = ({
  billingCycle,
  startDate = new Date(),
  trialDays = 0,
}) => {
  const startsAt = new Date(startDate);
  const expiresAt = new Date(startsAt);

  if (trialDays && trialDays > 0) {
    expiresAt.setDate(expiresAt.getDate() + Number(trialDays));
    return expiresAt;
  }

  if (billingCycle === SUBSCRIPTION_BILLING_CYCLE.YEARLY) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    return expiresAt;
  }

  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
};

export default calculateSubscriptionExpiry;
