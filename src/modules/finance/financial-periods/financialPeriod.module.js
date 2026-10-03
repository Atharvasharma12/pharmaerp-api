import { Router } from "express";
import financialPeriodRoutes from "./routes/financialPeriod.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", financialPeriodRoutes);

const financialPeriodModule = {
  path: "/financial-periods",
  router,
};

export default financialPeriodModule;
