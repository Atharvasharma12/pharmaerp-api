import platformSubscriptionRoutes from "./routes/platformSubscription.routes.js";

const platformSubscriptionModule = {
  path: "/subscriptions",
  router: platformSubscriptionRoutes,
};

export default platformSubscriptionModule;
