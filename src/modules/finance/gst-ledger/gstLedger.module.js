import { Router } from "express";
import gstLedgerRoutes from "./routes/gstLedger.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", gstLedgerRoutes);

const gstLedgerModule = {
  path: "/gst-ledger",
  router,
};

export default gstLedgerModule;
