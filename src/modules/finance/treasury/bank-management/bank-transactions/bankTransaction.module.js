import bankTransactionRoutes from "./routes/bankTransaction.routes.js";

const bankTransactionModule = {
  path: "/bank-transactions",
  router: bankTransactionRoutes,
};

export default bankTransactionModule;
