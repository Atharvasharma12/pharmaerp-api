import subscriptionRoutes from "./routes/subscription.routes.js";

const subscriptionModule = {
  path: "/subscriptions",
  router: subscriptionRoutes,
};

export default subscriptionModule;
