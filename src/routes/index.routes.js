import { Router } from "express";

import { API_PREFIX } from "../constants/app.constant.js";

import coreModule from "../modules/core/core.module.js";
import platformModule from "../modules/platform/platform.module.js";
import organizationModule from "../modules/organization/organization.module.js";
import subscriptionModule from "../modules/subscription/subscription.module.js";
import catalogModule from "../modules/catalog/catalog.module.js";
import partiesModule from "../modules/parties/parties.module.js";
import financeModule from "../modules/finance/finance.module.js";
import marketplaceModule from "../modules/marketplace/marketplace.module.js";
import salesModule from "../modules/sales/sales.module.js";
import transferOrderModule from "../modules/transfer-order/transferOrder.module.js";

const router = Router();

router.use(API_PREFIX + coreModule.path, coreModule.router);

router.use(API_PREFIX + platformModule.path, platformModule.router);

router.use(API_PREFIX + organizationModule.path, organizationModule.router);

router.use(API_PREFIX + subscriptionModule.path, subscriptionModule.router);

router.use(API_PREFIX + catalogModule.path, catalogModule.router);

router.use(API_PREFIX + partiesModule.path, partiesModule.router);

router.use(API_PREFIX + financeModule.path, financeModule.router);

router.use(API_PREFIX + marketplaceModule.path, marketplaceModule.router);

router.use(API_PREFIX + salesModule.path, salesModule.router);

router.use(API_PREFIX + transferOrderModule.path, transferOrderModule.router);

export default router;

