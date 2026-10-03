import { Router } from "express";

import planModule from "./plans/plan.module.js";
import subscriptionModule from "./subscriptions/subscription.module.js";

const router = Router();

router.use(planModule.path, planModule.router);

router.use(subscriptionModule.path, subscriptionModule.router);

export default router;
