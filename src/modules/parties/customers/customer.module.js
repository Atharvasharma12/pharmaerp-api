import customerRoutes from "./routes/customer.routes.js";

const customerModule = {
  path: "/customers",
  router: customerRoutes,
};

export default customerModule;
