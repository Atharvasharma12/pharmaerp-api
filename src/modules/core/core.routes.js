import { Router } from "express";

import healthModule from "./health/health.module.js";
import authModule from "./auth/auth.module.js";
import userModule from "./users/user.module.js";

const router = Router();

router.use(healthModule.path, healthModule.router);

router.use(authModule.path, authModule.router);

router.use(userModule.path, userModule.router);

export default router;
