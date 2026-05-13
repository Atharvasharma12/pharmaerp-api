import platformAuthRoutes from "./routes/platformAuth.routes.js";

const platformAuthModule = {
  path: "/auth",

  router: platformAuthRoutes,
};

export default platformAuthModule;
