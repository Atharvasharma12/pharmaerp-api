import crypto from "crypto";

import { SUBSCRIPTION_CODE_PREFIX } from "../../modules/subscription/subscriptions/constants/subscription.constant.js";

const generateSubscriptionCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `${SUBSCRIPTION_CODE_PREFIX}${timestamp}${random}`;
};

export default generateSubscriptionCode;
