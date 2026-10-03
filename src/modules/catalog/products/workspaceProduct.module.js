import workspaceProductRoutes from "./routes/workspaceProduct.routes.js";

const workspaceProductModule = {
  path: "/products",
  router: workspaceProductRoutes,
};

export default workspaceProductModule;
