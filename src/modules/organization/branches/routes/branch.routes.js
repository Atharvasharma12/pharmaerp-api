import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";

import validate from "../../../../middlewares/validate.middleware.js";

import {
  createBranch,
  getCompanyBranches,
  getWorkspaceBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";

import {
  createBranchSchema,
  updateBranchSchema,
} from "../validations/branch.validation.js";

const router = Router();

router.use(authMiddleware);

router.use(workspaceContextMiddleware);

/*
|--------------------------------------------------------------------------
| Workspace Level Routes
|--------------------------------------------------------------------------
*/

router.get("/workspace/all", getWorkspaceBranches);

/*
|--------------------------------------------------------------------------
| Company Level Routes
|--------------------------------------------------------------------------
*/

router.use(companyContextMiddleware);

router.post("/", validate(createBranchSchema), createBranch);

router.get("/", getCompanyBranches);

router.get("/:branchId", getBranchById);

router.patch("/:branchId", validate(updateBranchSchema), updateBranch);

router.delete("/:branchId", deleteBranch);

export default router;
