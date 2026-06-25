import cashTransactionRoutes from "./routes/cashTransaction.routes.js";

const cashTransactionModule = {
  path: "/cash-transactions",
  router: cashTransactionRoutes,
};

export default cashTransactionModule;
