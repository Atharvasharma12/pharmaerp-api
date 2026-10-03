import { Router } from "express";

import marketplaceStoreModule from "./stores/marketplaceStore.module.js";
import marketplaceProductModule from "./products/marketplaceProduct.module.js";
import marketplacePricingModule from "./pricing/marketplacePricing.module.js";

const router = Router();

router.use(marketplaceStoreModule.path, marketplaceStoreModule.router);
router.use(marketplaceProductModule.path, marketplaceProductModule.router);
router.use(marketplacePricingModule.path, marketplacePricingModule.router);

export default router;
