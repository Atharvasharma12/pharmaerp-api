import { Router } from "express";
import reportsRoutes from "./routes/reports.routes.js";

const router = Router();

// Mount all report routes
router.use("/", reportsRoutes);

const reportsModule = {
  path: "/reports",
  router,
};

export default reportsModule;
