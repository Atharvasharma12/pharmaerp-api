import { Router } from "express";
import authMiddleware from "../../../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../../../middlewares/companyContext.middleware.js";
import validate from "../../../../../../middlewares/validate.middleware.js";

import {
  getAllBranchCash,
  getBranchCash,
  depositCash,
  withdrawCash,
} from "../controllers/branchCash.controller.js";

import {
  depositSchema,
  withdrawSchema,
} from "../validations/branchCash.validation.js";

const router = Router();

router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// List all branches' cash for company
router.get("/", getAllBranchCash);

// Get cash for a specific branch (running + frozen + denominations)
router.get("/:branchId", getBranchCash);

// Deposit external cash into running partition (shift must be open)
router.post("/deposit", validate(depositSchema), depositCash);

// Withdraw cash from frozen partition (no shift restriction)
router.post("/withdraw", validate(withdrawSchema), withdrawCash);

export default router;
