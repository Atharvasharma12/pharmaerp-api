import { Router } from "express";

import workspaceModule from "./workspaces/workspace.module.js";
import companyModule from "./companies/company.module.js";
import branchModule from "./branches/branch.module.js";

const router = Router();

router.use(workspaceModule.path, workspaceModule.router);

router.use(companyModule.path, companyModule.router);

router.use(branchModule.path, branchModule.router);

export default router;
