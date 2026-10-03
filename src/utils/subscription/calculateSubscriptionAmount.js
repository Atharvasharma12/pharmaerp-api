import { getBillingCycleMultiplier } from "./billingCycle.js";

const calculateSubscriptionAmount = ({
  pricePerUser,
  seatQuantity,
  billingCycle,
}) => {
  const price = Number(pricePerUser || 0);
  const seats = Number(seatQuantity || 0);
  const multiplier = getBillingCycleMultiplier(billingCycle);

  const subtotal = price * seats * multiplier;

  return {
    pricePerUser: price,
    seatQuantity: seats,
    billingCycle,
    multiplier,
    subtotal,
    totalAmount: subtotal,
  };
};

export default calculateSubscriptionAmount;
