import workspaceRoutes from "./routes/workspace.routes.js";

const workspaceModule = {
  path: "/workspaces",
  router: workspaceRoutes,
};

export default workspaceModule;
