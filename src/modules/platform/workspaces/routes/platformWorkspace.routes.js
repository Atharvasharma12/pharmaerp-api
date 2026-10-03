import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";
import { allowPlatformRoles } from "../../../../middlewares/platformRole.middleware.js";

import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import {
  getPlatformWorkspaces,
  getPlatformWorkspaceById,
  updatePlatformWorkspaceStatus,
  deletePlatformWorkspace,
  getPlatformWorkspaceMembers,
} from "../controllers/platformWorkspace.controller.js";

import {
  platformWorkspaceIdParamSchema,
  getPlatformWorkspacesQuerySchema,
  updatePlatformWorkspaceStatusSchema,
} from "../validations/platformWorkspace.validation.js";

const router = Router();

// All routes require a valid platform session
router.use(platformAuthMiddleware);

/**
 * GET /platform/workspaces
 * List all workspaces with optional filters, search, and pagination.
 * Accessible by: SUPER_ADMIN, ADMIN, SUPPORT, BILLING_MANAGER, READ_ONLY
 */
router.get(
  "/",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.BILLING_MANAGER,
    PLATFORM_ROLES.READ_ONLY,
  ),
  validate(getPlatformWorkspacesQuerySchema, "query"),
  getPlatformWorkspaces,
);

/**
 * GET /platform/workspaces/:workspaceId
 * Get a single workspace by ID (includes owner details).
 * Accessible by: SUPER_ADMIN, ADMIN, SUPPORT, BILLING_MANAGER, READ_ONLY
 */
router.get(
  "/:workspaceId",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.BILLING_MANAGER,
    PLATFORM_ROLES.READ_ONLY,
  ),
  validate(platformWorkspaceIdParamSchema, "params"),
  getPlatformWorkspaceById,
);

/**
 * GET /platform/workspaces/:workspaceId/members
 * List all members of a workspace.
 * Accessible by: SUPER_ADMIN, ADMIN, SUPPORT, READ_ONLY
 */
router.get(
  "/:workspaceId/members",
  allowPlatformRoles(
    PLATFORM_ROLES.SUPER_ADMIN,
    PLATFORM_ROLES.ADMIN,
    PLATFORM_ROLES.SUPPORT,
    PLATFORM_ROLES.READ_ONLY,
  ),
  validate(platformWorkspaceIdParamSchema, "params"),
  getPlatformWorkspaceMembers,
);

/**
 * PATCH /platform/workspaces/:workspaceId/status
 * Update the status of a workspace (active / inactive / suspended).
 * Accessible by: SUPER_ADMIN, ADMIN
 */
router.patch(
  "/:workspaceId/status",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN),
  validate(platformWorkspaceIdParamSchema, "params"),
  validate(updatePlatformWorkspaceStatusSchema),
  updatePlatformWorkspaceStatus,
);

/**
 * DELETE /platform/workspaces/:workspaceId
 * Soft-delete a workspace.
 * Accessible by: SUPER_ADMIN only
 */
router.delete(
  "/:workspaceId",
  allowPlatformRoles(PLATFORM_ROLES.SUPER_ADMIN),
  validate(platformWorkspaceIdParamSchema, "params"),
  deletePlatformWorkspace,
);

export default router;
