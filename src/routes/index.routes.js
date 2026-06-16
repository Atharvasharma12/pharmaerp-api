import { Router } from "express";

import { API_PREFIX } from "../constants/app.constant.js";

import coreModule from "../modules/core/core.module.js";
import platformModule from "../modules/platform/platform.module.js";
import organizationModule from "../modules/organization/organization.module.js";
import subscriptionModule from "../modules/subscription/subscription.module.js";
import catalogModule from "../modules/catalog/catalog.module.js";

const router = Router();

router.use(API_PREFIX + coreModule.path, coreModule.router);

router.use(API_PREFIX + platformModule.path, platformModule.router);

router.use(API_PREFIX + organizationModule.path, organizationModule.router);

router.use(API_PREFIX + subscriptionModule.path, subscriptionModule.router);

router.use(API_PREFIX + catalogModule.path, catalogModule.router);

export default router;
