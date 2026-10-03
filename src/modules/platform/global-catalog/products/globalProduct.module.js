import globalProductRoutes from "./routes/globalProduct.routes.js";

const globalProductModule = {
  path: "/products",
  router: globalProductRoutes,
};

export default globalProductModule;
