import platformPricingRoutes from "./routes/platformPricing.routes.js";

const platformPricingModule = {
  path: "/pricing",
  router: platformPricingRoutes,
};

export default platformPricingModule;
