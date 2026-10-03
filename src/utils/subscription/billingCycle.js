import { SUBSCRIPTION_BILLING_CYCLE } from "../../modules/subscription/subscriptions/constants/subscription.constant.js";

export const isMonthlyBilling = (billingCycle) => {
  return billingCycle === SUBSCRIPTION_BILLING_CYCLE.MONTHLY;
};

export const isYearlyBilling = (billingCycle) => {
  return billingCycle === SUBSCRIPTION_BILLING_CYCLE.YEARLY;
};

export const getBillingCycleMultiplier = (billingCycle) => {
  if (isMonthlyBilling(billingCycle)) {
    return 1;
  }

  if (isYearlyBilling(billingCycle)) {
    return 12;
  }

  return 1;
};

export const normalizeBillingCycle = (billingCycle) => {
  if (!billingCycle) {
    return SUBSCRIPTION_BILLING_CYCLE.MONTHLY;
  }

  return String(billingCycle).trim().toLowerCase();
};

export default {
  isMonthlyBilling,
  isYearlyBilling,
  getBillingCycleMultiplier,
  normalizeBillingCycle,
};
