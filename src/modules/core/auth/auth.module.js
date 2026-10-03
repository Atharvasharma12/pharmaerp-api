import authRoutes from "./routes/auth.routes.js";

const authModule = {
  path: "/auth",
  router: authRoutes,
};

export default authModule;
