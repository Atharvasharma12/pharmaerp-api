import ApiError from "../../../../utils/ApiError.js";

import authRepository from "../repositories/auth.repository.js";

import workspaceRepository from "../../../organization/workspaces/repositories/workspace.repository.js";

import roleService from "../../access-control/services/role.service.js";
import memberAccessService from "../../access-control/services/memberAccess.service.js";

import subscriptionRepository from "../../../subscription/subscriptions/repositories/subscription.repository.js";
import planRepository from "../../../subscription/plans/repositories/plan.repository.js";

import {
  generateAccessToken,
  buildAuthPayload,
} from "../../../../utils/jwt.js";

import { WORKSPACE_MEMBER_STATUS } from "../../../organization/workspaces/constants/workspace.constant.js";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} from "../../../subscription/subscriptions/constants/subscription.constant.js";

import {
  PLAN_STATUS,
  PLAN_TYPE,
} from "../../../subscription/plans/constants/plan.constant.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createSlug = (name) => {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildPlanSnapshot = (plan) => ({
  planCode: plan.planCode,
  name: plan.name,
  type: plan.type,
  pricePerUser: plan.pricePerUser,
  billingCycle: plan.billingCycle,
  modules: plan.modules || [],
  features: plan.features || {},
});

// ─── Step 1: Create User ─────────────────────────────────────────────────────

const _createUser = async ({ email, password, fullName, phone }) => {
  const existingEmail = await authRepository.findUserByEmail(email);

  if (existingEmail) {
    throw new ApiError(400, "Email already registered");
  }

  const user = await authRepository.createUser({
    email,
    password,
    fullName,
    phone,
  });

  return user;
};

// ─── Step 2: Create Workspace ─────────────────────────────────────────────────

/**
 * Auto-generates workspace name from the user's full name:
 *   e.g. "Devansh Upadhyay" → "Devansh Upadhyay's Workspace"
 * Handles slug collisions by appending a short random suffix.
 */
const _createWorkspace = async (userId, fullName) => {
  const workspaceName = `${fullName.trim()}'s Workspace`;
  let slug = createSlug(workspaceName);

  // If slug already taken, append a 4-char random hex suffix
  const existingWorkspace = await workspaceRepository.findWorkspaceBySlug(slug);
  if (existingWorkspace) {
    slug = `${slug}-${Math.random().toString(16).slice(2, 6)}`;
  }

  // Always default to pharmacy for now
  const workspace = await workspaceRepository.createWorkspace({
    name: workspaceName,
    slug,
    type: "pharmacy",
    ownerId: userId,
  });

  // Set up default roles for the workspace
  await roleService.createDefaultRolesForWorkspace(workspace._id, userId);

  const ownerRole = await roleService.getOwnerRoleForWorkspace(workspace._id);

  if (!ownerRole) {
    throw new ApiError(500, "Owner role could not be created for workspace");
  }

  // Add the registering user as the workspace owner member
  const ownerMember = await workspaceRepository.createWorkspaceMember({
    workspaceId: workspace._id,
    userId,
    roleId: ownerRole._id,
    createdBy: userId,
    status: WORKSPACE_MEMBER_STATUS.ACTIVE,
    isOwner: true,
    isPrimary: true,
  });

  // Grant full default access to the owner
  await memberAccessService.createDefaultAccessForMember({
    workspaceId: workspace._id,
    workspaceMemberId: ownerMember._id,
    userId,
    createdBy: userId,
    accessAllCompanies: true,
    accessAllBranches: true,
    companyIds: [],
    branchIds: [],
  });

  return workspace;
};

// ─── Step 3: Activate Free Plan ──────────────────────────────────────────────

const _activateFreePlan = async (userId, workspaceId) => {
  // Look up the dedicated free plan by type
  const activePlans = await planRepository.getActivePlans();
  const freePlan = activePlans.find((p) => p.type === PLAN_TYPE.FREE);

  if (!freePlan) {
    throw new ApiError(
      500,
      "Free plan is not configured. Please contact support.",
    );
  }

  const startsAt = new Date();

  const subscription = await subscriptionRepository.createSubscription({
    workspaceId,
    planId: freePlan._id,
    purchasedBy: userId,

    currentPlanSnapshot: buildPlanSnapshot(freePlan),

    billingCycle: freePlan.billingCycle,
    pricePerUser: 0,

    seatQuantity: 1,
    activeSeatCount: 1,

    subtotalAmount: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,

    currency: "INR",

    // Free plan never expires — no expiresAt set
    status: SUBSCRIPTION_STATUS.FREE,
    paymentStatus: SUBSCRIPTION_PAYMENT_STATUS.PAID,

    startsAt,
    expiresAt: null,

    trialUsed: false,
  });

  return subscription;
};

// ─── Main Orchestrator ───────────────────────────────────────────────────────

/**
 * Combined registration onboarding:
 *  1. Create User
 *  2. Create Workspace (name auto-derived from fullName, type always "pharmacy")
 *  3. Activate Free Plan subscription (permanent, no expiry)
 *
 * @param {object} payload
 * @param {string} payload.fullName
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {string} [payload.phone]
 */
const registerWithOnboarding = async (payload) => {
  const { fullName, email, password, phone } = payload;

  // Step 1 — Create user account
  const user = await _createUser({ email, password, fullName, phone });

  // Step 2 — Create workspace (name auto-generated, type = pharmacy)
  const workspace = await _createWorkspace(user._id, fullName);

  // Step 3 — Activate the free plan for the workspace (no expiry)
  const subscription = await _activateFreePlan(user._id, workspace._id);

  // Generate auth token
  const token = generateAccessToken(buildAuthPayload({ userId: user._id }));

  return {
    user: user.toSafeObject(),
    workspace: workspace.toSafeObject(),
    subscription: subscription.toSafeObject(),
    token,
  };
};

export default {
  registerWithOnboarding,
};
