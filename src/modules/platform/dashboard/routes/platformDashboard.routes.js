// c:\Users\Intel\Desktop\erp\erp-backend\src\modules\platform\dashboard\routes\platformDashboard.routes.js

import { Router } from "express";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { getDashboardStats } from "../controllers/platformDashboard.controller.js";

const router = Router();

router.use(platformAuthMiddleware);

router.get("/", getDashboardStats);

export default router;
