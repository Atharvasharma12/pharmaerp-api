import bankAccountRoutes from "./routes/bankAccount.routes.js";

const bankAccountModule = {
  path: "/bank-accounts",
  router: bankAccountRoutes,
};

export default bankAccountModule;
