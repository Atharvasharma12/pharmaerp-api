import { Router } from "express";
import accountGroupRoutes from "./routes/accountGroup.routes.js";
import accountRoutes from "./routes/account.routes.js";

const router = Router();

// Mount submodule routes
router.use("/account-groups", accountGroupRoutes);
router.use("/accounts", accountRoutes);

const chartOfAccountsModule = {
  path: "/chart-of-accounts",
  router,
};

export default chartOfAccountsModule;
