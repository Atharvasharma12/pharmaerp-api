import { Router } from "express";
import openingBalanceRoutes from "./routes/openingBalance.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", openingBalanceRoutes);

const openingBalancesModule = {
  path: "/opening-balances",
  router,
};

export default openingBalancesModule;
