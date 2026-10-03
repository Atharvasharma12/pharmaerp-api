import { Router } from "express";
import accountBalanceRoutes from "./routes/accountBalance.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", accountBalanceRoutes);

const accountBalanceModule = {
  path: "/account-balances",
  router,
};

export default accountBalanceModule;
