import { Router } from "express";

import workspaceProductModule from "./products/workspaceProduct.module.js";
import catalogGlobalProductModule from "./global-products/catalogGlobalProduct.module.js";

const router = Router();

// ---------------------
// /catalog/products
// ---------------------
router.use(workspaceProductModule.path, workspaceProductModule.router);

// ---------------------
// /catalog/global-products
// ---------------------
router.use(catalogGlobalProductModule.path, catalogGlobalProductModule.router);

export default router;
