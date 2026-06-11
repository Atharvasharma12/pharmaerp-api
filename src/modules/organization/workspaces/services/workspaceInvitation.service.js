// src/modules/organization/workspaces/services/workspaceInvitation.service.js

import ApiError from "../../../../utils/ApiError.js";

import workspaceRepository from "../repositories/workspace.repository.js";
import workspaceInvitationRepository from "../repositories/workspaceInvitation.repository.js";
import subscriptionRepository from "../../../subscription/subscriptions/repositories/subscription.repository.js";

import roleService from "../../../core/access-control/services/role.service.js";

import { SYSTEM_ROLES } from "../../../core/access-control/constants/role.constant.js";

import {
  WORKSPACE_MEMBER_STATUS,
  WORKSPACE_INVITATION_STATUS,
} from "../constants/workspace.constant.js";
import { sendEmail } from "../../../../utils/sendEmail.js";
import crypto from "crypto";

// Import the model directly to instantiate it before database insertion
import WorkspaceInvitation from "../models/workspaceInvitation.model.js";
import mongoose from "mongoose";

const INVITATION_EXPIRY_HOURS = 72;

const inviteMember = async (workspaceId, invitedBy, payload) => {
  const currentMember = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    invitedBy,
  );

  if (
    !currentMember ||
    currentMember.status !== WORKSPACE_MEMBER_STATUS.ACTIVE
  ) {
    throw new ApiError(403, "You do not have access to this workspace");
  }

  if (!currentMember.isOwner) {
    throw new ApiError(403, "Only workspace owner can invite members");
  }

  const email = String(payload.email).trim().toLowerCase();

  const existingInvitation =
    await workspaceInvitationRepository.findPendingInvitationByEmail(
      workspaceId,
      email,
    );

  if (existingInvitation) {
    throw new ApiError(
      400,
      "An active invitation already exists for this email",
    );
  }

  const existingUserMember =
    await workspaceRepository.findWorkspaceMemberByEmail?.(workspaceId, email);

  if (existingUserMember) {
    throw new ApiError(400, "User is already a workspace member");
  }

  const subscription =
    await subscriptionRepository.findActiveSubscriptionByWorkspace(workspaceId);

  if (!subscription) {
    throw new ApiError(400, "Active subscription not found");
  }

  const activeMembers =
    await workspaceRepository.countActiveWorkspaceMembers(workspaceId);

  const pendingInvitations =
    await workspaceInvitationRepository.countPendingInvitations(workspaceId);

  const occupiedSeats = activeMembers + pendingInvitations;

  if (occupiedSeats >= subscription.seatQuantity) {
    throw new ApiError(
      400,
      `Seat limit reached (${subscription.seatQuantity})`,
    );
  }

  let roleId = payload.roleId || null;

  if (!roleId) {
    const staffRole = await roleService.getRoleByCodeForWorkspace(
      workspaceId,
      SYSTEM_ROLES.STAFF,
    );

    if (staffRole) {
      roleId = staffRole._id;
    }
  }

  // FIX: Create a local document instance instead of running WorkspaceInvitation.create()
  // This avoids running validations until tokenHash is generated
  const invitation = new WorkspaceInvitation({
    workspaceId,
    invitedEmail: email,
    roleId,
    invitedBy,
    notes: payload.notes,
    expiresAt: new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000),
    status: WORKSPACE_INVITATION_STATUS.PENDING,
  });

  // Now safely generate the token and apply it to this instance's tokenHash path
  const rawToken = invitation.createInvitationToken();

  // Commit the validated document with tokenHash included to the database
  await workspaceInvitationRepository.saveInvitation(invitation);

  const invitationLink = `${process.env.FRONTEND_URL}/workspace-invitations/${rawToken}`;

  await sendEmail({
    to: email,
    subject: "You're invited to join a Workspace",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Workspace Invitation</h2>

      <p>You have been invited to join a workspace.</p>

      <p>
        Click the button below to accept the invitation:
      </p>

      <p>
        <a
          href="${invitationLink}"
          style="
            display:inline-block;
            background:#2563eb;
            color:#ffffff;
            padding:12px 24px;
            text-decoration:none;
            border-radius:6px;
          "
        >
          Accept Invitation
        </a>
      </p>

      <p>
        If the button doesn't work, use this link:
      </p>

      <p>
        <a href="${invitationLink}">
          ${invitationLink}
        </a>
      </p>

      <p>
        This invitation will expire in ${INVITATION_EXPIRY_HOURS} hours.
      </p>

      ${
        payload.notes ? `<p><strong>Message:</strong> ${payload.notes}</p>` : ""
      }

      <hr />

      <p style="color:#666;font-size:12px;">
        If you were not expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `,
    text: `
You have been invited to join a workspace.

Accept invitation:
${invitationLink}

This invitation expires in ${INVITATION_EXPIRY_HOURS} hours.
  `,
  });

  return invitation.toSafeObject();
};

const getWorkspaceInvitations = async (workspaceId, userId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member) {
    throw new ApiError(403, "Access denied");
  }

  const invitations =
    await workspaceInvitationRepository.getWorkspaceInvitations(workspaceId, {
      populate: "roleId invitedBy acceptedBy cancelledBy",
    });

  return invitations.map((item) => item.toSafeObject());
};
const getIncomingUserInvitations = async (userEmail) => {
  const email = String(userEmail).trim().toLowerCase();

  // Clean up any stale expired items reactively first
  await workspaceInvitationRepository.markExpiredInvitations();

  const invitations =
    await workspaceInvitationRepository.findPendingInvitationsByEmailOnly(
      email,
      { populate: "workspaceId invitedBy roleId" },
    );

  return invitations.map((item) => item.toSafeObject());
};

const cancelInvitation = async (workspaceId, userId, invitationId) => {
  const member = await workspaceRepository.findWorkspaceMember(
    workspaceId,
    userId,
  );

  if (!member) {
    throw new ApiError(403, "Access denied");
  }

  if (!member.isOwner) {
    throw new ApiError(403, "Only workspace owner can cancel invitations");
  }

  const invitation =
    await workspaceInvitationRepository.findInvitationById(invitationId);

  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  if (invitation.workspaceId.toString() !== workspaceId.toString()) {
    throw new ApiError(403, "Invitation does not belong to workspace");
  }

  const cancelledInvitation =
    await workspaceInvitationRepository.cancelInvitationById(
      invitationId,
      userId,
    );

  return cancelledInvitation.toSafeObject();
};

const acceptInvitation = async (tokenOrId, userId) => {
  let invitation;

  // 1. Check if the parameter passed from the UI is a valid direct Document ObjectId string
  if (mongoose.Types.ObjectId.isValid(tokenOrId)) {
    invitation = await workspaceInvitationRepository.findInvitationById(
      tokenOrId,
      {
        populate: "roleId",
      },
    );
  } else {
    // 2. Fallback: Treat it as a plain-text token hash coming from an email link click
    const tokenHash = crypto
      .createHash("sha256")
      .update(tokenOrId)
      .digest("hex");

    invitation = await workspaceInvitationRepository.findInvitationByTokenHash(
      tokenHash,
      {
        populate: "roleId",
      },
    );
  }

  // --- Core Validation Checks (Retained from your original controller logic) ---
  if (!invitation) {
    throw new ApiError(404, "Invitation not found or no longer active");
  }

  if (invitation.isExpired()) {
    throw new ApiError(400, "Invitation has expired");
  }

  const existingMember = await workspaceRepository.findWorkspaceMember(
    invitation.workspaceId,
    userId,
  );

  if (existingMember) {
    throw new ApiError(400, "Already a member of this workspace");
  }

  // 3. Commit Membership Mapping Record Allocation
  await workspaceRepository.createWorkspaceMember({
    workspaceId: invitation.workspaceId,
    userId,
    roleId: invitation.roleId,
    createdBy: invitation.invitedBy,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    isOwner: false,
    isPrimary: false,
  });

  // 4. Conclude tracking state flag metrics
  await workspaceInvitationRepository.markInvitationAccepted(
    invitation._id,
    userId,
  );

  return {
    success: true,
    workspaceId: invitation.workspaceId,
  };
};

export default {
  inviteMember,
  getWorkspaceInvitations,
  cancelInvitation,
  acceptInvitation,
  getIncomingUserInvitations,
};
