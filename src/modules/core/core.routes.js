// src/modules/core/core.routes.js

import { Router } from "express";

import healthModule from "./health/health.module.js";
import authModule from "./auth/auth.module.js";
import userModule from "./users/user.module.js";
import accessControlModule from "./access-control/access-control.module.js";

const router = Router();

router.use(healthModule.path, healthModule.router);

router.use(authModule.path, authModule.router);

router.use(userModule.path, userModule.router);

router.use(accessControlModule.path, accessControlModule.router);

export default router;
