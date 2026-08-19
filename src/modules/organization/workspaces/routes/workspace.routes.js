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
  directCreateWorkspaceMember,
  resetMemberPassword,
} from "../controllers/workspace.controller.js";

import {
  inviteWorkspaceMember,
  getWorkspaceInvitations,
  cancelWorkspaceInvitation,
  resendWorkspaceInvitation,
  updateWorkspaceInvitation,
  getPublicInvitationDetails,
  acceptWorkspaceInvitation,
  acceptWorkspaceInvitationSignup,
  getIncomingUserInvitations,
} from "../controllers/workspaceInvitation.controller.js";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberStatusSchema,
  directCreateWorkspaceMemberSchema,
  resetMemberPasswordSchema,
} from "../validations/workspace.validation.js";

import {
  inviteWorkspaceMemberSchema,
  updateWorkspaceInvitationSchema,
  cancelWorkspaceInvitationSchema,
  resendWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSchema,
  acceptWorkspaceInvitationSignupSchema,
} from "../validations/workspaceInvitation.validation.js";

const router = Router();

// --- PUBLIC INVITATION ROUTES (No prior auth required) ---
router.get("/invitations/public/:token", getPublicInvitationDetails);
router.post(
  "/invitations/:token/accept-signup",
  validate(acceptWorkspaceInvitationSignupSchema),
  acceptWorkspaceInvitationSignup,
);

// --- PROTECTED ROUTES ---
router.use(authMiddleware);

router.post("/", validate(createWorkspaceSchema), createWorkspace);

router.get("/", getMyWorkspaces);

router.post(
  "/:workspaceId/invitations",
  validate(inviteWorkspaceMemberSchema),
  inviteWorkspaceMember,
);

router.get("/user-inbox/invitations", getIncomingUserInvitations);

router.get("/:workspaceId/invitations", getWorkspaceInvitations);

router.patch(
  "/:workspaceId/invitations/:invitationId",
  validate(updateWorkspaceInvitationSchema),
  updateWorkspaceInvitation,
);

router.post(
  "/:workspaceId/invitations/:invitationId/resend",
  validate(resendWorkspaceInvitationSchema),
  resendWorkspaceInvitation,
);

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

router.post(
  "/:workspaceId/members/direct-create",
  validate(directCreateWorkspaceMemberSchema),
  directCreateWorkspaceMember,
);

router.post(
  "/:workspaceId/members/:memberUserId/reset-password",
  validate(resetMemberPasswordSchema),
  resetMemberPassword,
);

router.patch(
  "/:workspaceId/members/:memberUserId/status",
  validate(updateWorkspaceMemberStatusSchema),
  updateWorkspaceMemberStatus,
);

router.delete("/:workspaceId/members/:memberUserId", removeWorkspaceMember);

export default router;
