import { Router } from "express";
import journalVoucherRoutes from "./routes/journalVoucher.routes.js";

const router = Router();

// Mount submodule routes
router.use("/", journalVoucherRoutes);

const journalVoucherModule = {
  path: "/journal-vouchers",
  router,
};

export default journalVoucherModule;
