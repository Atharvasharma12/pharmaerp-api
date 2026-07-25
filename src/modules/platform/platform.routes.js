import { Router } from "express";

import platformAuthModule from "./auth/platformAuth.module.js";
import platformUserModule from "./users/platformUser.module.js";
import platformPlanModule from "./plans/platformPlan.module.js";
import platformSubscriptionModule from "./subscriptions/platformSubscription.module.js";
import globalCatalogModule from "./global-catalog/globalCatalog.module.js";
import platformMarketplaceSettingsModule from "./marketplace-settings/platformMarketplaceSettings.module.js";
import platformWorkspaceModule from "./workspaces/platformWorkspace.module.js";
import platformStoreVerificationModule from "./store-verification/platformStoreVerification.module.js";
import platformPricingModule from "./pricing/platformPricing.module.js";
import platformMarketplaceStoreModule from "./marketplace-stores/platformMarketplaceStore.module.js";
import platformDashboardModule from "./dashboard/platformDashboard.module.js";

const router = Router();

router.use(platformAuthModule.path, platformAuthModule.router);

router.use(platformUserModule.path, platformUserModule.router);

router.use(platformPlanModule.path, platformPlanModule.router);

router.use(platformSubscriptionModule.path, platformSubscriptionModule.router);

router.use(globalCatalogModule.path, globalCatalogModule.router);

router.use(
  platformMarketplaceSettingsModule.path,
  platformMarketplaceSettingsModule.router,
);

router.use(
  platformStoreVerificationModule.path,
  platformStoreVerificationModule.router,
);

router.use(platformPricingModule.path, platformPricingModule.router);

router.use(
  platformMarketplaceStoreModule.path,
  platformMarketplaceStoreModule.router,
);

router.use(platformWorkspaceModule.path, platformWorkspaceModule.router);

router.use(platformDashboardModule.path, platformDashboardModule.router);

export default router;
