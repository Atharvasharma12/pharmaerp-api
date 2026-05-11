import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberStatus,
  removeWorkspaceMember,
} from "../controllers/workspace.controller.js";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceMemberSchema,
  updateWorkspaceMemberStatusSchema,
} from "../validations/workspace.validation.js";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createWorkspaceSchema), createWorkspace);

router.get("/", getMyWorkspaces);

router.get("/:workspaceId", getWorkspaceById);

router.patch("/:workspaceId", validate(updateWorkspaceSchema), updateWorkspace);

router.delete("/:workspaceId", deleteWorkspace);

router.get("/:workspaceId/members", getWorkspaceMembers);

router.post(
  "/:workspaceId/members",
  validate(addWorkspaceMemberSchema),
  addWorkspaceMember,
);

router.patch(
  "/:workspaceId/members/:memberUserId/status",
  validate(updateWorkspaceMemberStatusSchema),
  updateWorkspaceMemberStatus,
);

router.delete("/:workspaceId/members/:memberUserId", removeWorkspaceMember);

export default router;
