import { Router } from "express";
import ledgerRoutes from "./routes/ledger.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", ledgerRoutes);

const ledgerModule = {
  path: "/ledger",
  router,
};

export default ledgerModule;
