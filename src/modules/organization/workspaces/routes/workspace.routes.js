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
  updateWorkspaceMemberStatus,
  removeWorkspaceMember,
} from "../controllers/workspace.controller.js";

import {
  inviteWorkspaceMember,
  getWorkspaceInvitations,
  cancelWorkspaceInvitation,
  acceptWorkspaceInvitation,
} from "../controllers/workspaceInvitation.controller.js";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberStatusSchema,
} from "../validations/workspace.validation.js";

import {
  inviteWorkspaceMemberSchema,
  cancelWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSchema,
} from "../validations/workspaceInvitation.validation.js";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createWorkspaceSchema), createWorkspace);

router.get("/", getMyWorkspaces);

router.post(
  "/:workspaceId/invitations",
  validate(inviteWorkspaceMemberSchema),
  inviteWorkspaceMember,
);

router.get("/:workspaceId/invitations", getWorkspaceInvitations);

router.patch(
  "/:workspaceId/invitations/:invitationId/cancel",
  validate(cancelWorkspaceInvitationSchema),
  cancelWorkspaceInvitation,
);

router.post(
  "/invitations/:token/accept",
  validate(acceptWorkspaceInvitationSchema),
  acceptWorkspaceInvitation,
);

router.get("/:workspaceId", getWorkspaceById);

router.patch("/:workspaceId", validate(updateWorkspaceSchema), updateWorkspace);

router.delete("/:workspaceId", deleteWorkspace);

router.get("/:workspaceId/members", getWorkspaceMembers);

router.patch(
  "/:workspaceId/members/:memberUserId/status",
  validate(updateWorkspaceMemberStatusSchema),
  updateWorkspaceMemberStatus,
);

router.delete("/:workspaceId/members/:memberUserId", removeWorkspaceMember);

export default router;
