import ApiError from "../../../../utils/ApiError.js";

import workspaceRepository from "../repositories/workspace.repository.js";
import workspaceInvitationRepository from "../repositories/workspaceInvitation.repository.js";
import subscriptionRepository from "../../../subscription/subscriptions/repositories/subscription.repository.js";

import roleService from "../../../core/access-control/services/role.service.js";

import { SYSTEM_ROLES } from "../../../core/access-control/constants/role.constant.js";

import {
  WORKSPACE_MEMBER_STATUS,
  WORKSPACE_INVITATION_STATUS,
  WORKSPACE_INVITATION_EXPIRY_HOURS,
} from "../constants/workspace.constant.js";
import { sendEmail } from "../../../../utils/sendEmail.js";

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

  const invitation = await workspaceInvitationRepository.createInvitation({
    workspaceId,
    invitedEmail: email,
    roleId,
    invitedBy,
    notes: payload.notes,
    expiresAt: new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000),
    status: WORKSPACE_INVITATION_STATUS.PENDING,
  });

  const rawToken = invitation.createInvitationToken();

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

const acceptInvitation = async (token, userId) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation =
    await workspaceInvitationRepository.findInvitationByTokenHash(tokenHash, {
      populate: "roleId",
    });

  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
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

  await workspaceRepository.createWorkspaceMember({
    workspaceId: invitation.workspaceId,
    userId,
    roleId: invitation.roleId,
    createdBy: invitation.invitedBy,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    isOwner: false,
    isPrimary: false,
  });

  await workspaceInvitationRepository.markInvitationAccepted(
    invitation._id,
    userId,
  );

  return {
    success: true,
  };
};

export default {
  inviteMember,
  getWorkspaceInvitations,
  cancelInvitation,
  acceptInvitation,
};
