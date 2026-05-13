import { Router } from "express";

import platformAuthModule from "./auth/platformAuth.module.js";
import platformUserModule from "./users/platformUser.module.js";
import platformPlanModule from "./plans/platformPlan.module.js";
import platformSubscriptionModule from "./subscriptions/platformSubscription.module.js";

const router = Router();

router.use(platformAuthModule.path, platformAuthModule.router);

router.use(platformUserModule.path, platformUserModule.router);

router.use(platformPlanModule.path, platformPlanModule.router);

router.use(platformSubscriptionModule.path, platformSubscriptionModule.router);

export default router;
