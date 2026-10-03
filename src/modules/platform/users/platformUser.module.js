import platformUserRoutes from "./routes/platformUser.routes.js";

const platformUserModule = {
  path: "/users",

  router: platformUserRoutes,
};

export default platformUserModule;
