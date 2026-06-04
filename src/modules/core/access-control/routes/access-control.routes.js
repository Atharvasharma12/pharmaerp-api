// src/modules/core/access-control/routes/access-control.routes.js

import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";

import validate from "../../../../middlewares/validate.middleware.js";

import {
  createRole,
  getWorkspaceRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRoleToMember,
  getAvailablePermissions,
} from "../controllers/role.controller.js";

import {
  getMemberAccess,
  getWorkspaceMemberAccessList,
  updateMemberAccess,
  checkCompanyAccess,
  checkBranchAccess,
} from "../controllers/memberAccess.controller.js";

import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleToMemberSchema,
} from "../validations/role.validation.js";

import { updateMemberAccessSchema } from "../validations/memberAccess.validation.js";

const router = Router();

router.use(authMiddleware);

router.use(workspaceContextMiddleware);

// Permissions
router.get("/permissions", getAvailablePermissions);

// Roles
router.post("/roles", validate(createRoleSchema), createRole);

router.get("/roles", getWorkspaceRoles);

router.get("/roles/:roleId", getRoleById);

router.patch("/roles/:roleId", validate(updateRoleSchema), updateRole);

router.delete("/roles/:roleId", deleteRole);

// Member Role Assignment
router.patch(
  "/members/:memberUserId/role",
  validate(assignRoleToMemberSchema),
  assignRoleToMember,
);

// Member Access
router.get("/member-access", getWorkspaceMemberAccessList);

router.get("/member-access/:memberUserId", getMemberAccess);

router.patch(
  "/member-access/:memberUserId",
  validate(updateMemberAccessSchema),
  updateMemberAccess,
);

// Access Checks
router.get("/check/company/:companyId", checkCompanyAccess);

router.get("/check/branch/:branchId", checkBranchAccess);

export default router;
