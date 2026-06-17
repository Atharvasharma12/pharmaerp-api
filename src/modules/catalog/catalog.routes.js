import { Router } from "express";

import workspaceProductModule from "./products/workspaceProduct.module.js";
import catalogGlobalProductModule from "./global-products/catalogGlobalProduct.module.js";
import catalogHsnMasterModule from "./hsn-master/catalogHsnMaster.module.js";

const router = Router();

// ---------------------
// /catalog/products
// ---------------------
router.use(workspaceProductModule.path, workspaceProductModule.router);

// ---------------------
// /catalog/global-products
// ---------------------
router.use(catalogGlobalProductModule.path, catalogGlobalProductModule.router);

// ---------------------
// /catalog/hsn-master
// ---------------------
router.use(catalogHsnMasterModule.path, catalogHsnMasterModule.router);

export default router;
