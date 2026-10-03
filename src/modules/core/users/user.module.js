import userRoutes from "./routes/user.routes.js";

const userModule = {
  path: "/users",
  router: userRoutes,
};

export default userModule;
