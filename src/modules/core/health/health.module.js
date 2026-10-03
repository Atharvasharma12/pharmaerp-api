import healthRoutes from "./routes/health.routes.js";

const healthModule = {
  path: "/health",
  router: healthRoutes,
};

export default healthModule;
