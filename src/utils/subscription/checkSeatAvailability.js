import { SUBSCRIPTION_MIN_SEATS } from "../../modules/subscription/subscriptions/constants/subscription.constant.js";

const checkSeatAvailability = ({
  seatQuantity,
  activeUserCount,
  requestedSeats = 1,
}) => {
  const seats = Number(seatQuantity || 0);
  const activeUsers = Number(activeUserCount || 0);
  const requested = Number(requestedSeats || 1);

  const availableSeats = seats - activeUsers;

  return {
    seatQuantity: seats,
    activeUserCount: activeUsers,
    requestedSeats: requested,
    availableSeats,
    hasAvailableSeats: availableSeats >= requested,
    minimumSeatsValid: seats >= SUBSCRIPTION_MIN_SEATS,
  };
};

export default checkSeatAvailability;
