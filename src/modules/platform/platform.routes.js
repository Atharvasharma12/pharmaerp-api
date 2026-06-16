import { Router } from "express";

import platformAuthModule from "./auth/platformAuth.module.js";
import platformUserModule from "./users/platformUser.module.js";
import platformPlanModule from "./plans/platformPlan.module.js";
import platformSubscriptionModule from "./subscriptions/platformSubscription.module.js";
import globalCatalogModule from "./global-catalog/globalCatalog.module.js";

const router = Router();

router.use(platformAuthModule.path, platformAuthModule.router);

router.use(platformUserModule.path, platformUserModule.router);

router.use(platformPlanModule.path, platformPlanModule.router);

router.use(platformSubscriptionModule.path, platformSubscriptionModule.router);

router.use(globalCatalogModule.path, globalCatalogModule.router);

export default router;
