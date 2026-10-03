import platformWorkspaceRoutes from "./routes/platformWorkspace.routes.js";

const platformWorkspaceModule = {
  path: "/workspaces",
  router: platformWorkspaceRoutes,
};

export default platformWorkspaceModule;
