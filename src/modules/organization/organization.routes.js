import { Router } from "express";

import workspaceModule from "./workspaces/workspace.module.js";

const router = Router();

router.use(workspaceModule.path, workspaceModule.router);

export default router;
