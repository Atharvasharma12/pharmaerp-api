import mongoose from "mongoose";

import {
  PLAN_STATUS,
  PLAN_INTERVAL,
  PLAN_TYPE,
  PLAN_MODULES,
  PLAN_LIMITS,
  DEFAULT_PLAN_FEATURES,
  PLAN_CODE_PREFIX,
  FREE_PLAN_SLUG,
} from "../constants/plan.constant.js";

/**
 * UI-level feature flags — things like custom branding, priority support.
 * NOT for limits (use limitsSchema for that).
 */
const featureSchema = new mongoose.Schema(
  {
    customBranding: {
      type: Boolean,
      default: DEFAULT_PLAN_FEATURES.customBranding,
    },

    prioritySupport: {
      type: Boolean,
      default: DEFAULT_PLAN_FEATURES.prioritySupport,
    },
  },
  { _id: false },
);

/**
 * Hard resource limits per plan.
 * maxCompanies — how many companies the workspace can create.
 * maxBranches  — how many branches across all companies.
 * maxUsers     — how many users (seats) the workspace can have.
 */
const limitsSchema = new mongoose.Schema(
  {
    maxCompanies: {
      type: Number,
      min: 1,
      default: 1,
    },

    maxBranches: {
      type: Number,
      min: 1,
      default: 1,
    },

    maxUsers: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false },
);

const featureItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: String,
      required: true,
      trim: true,
    },

    included: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const planSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: [120, "Plan name cannot exceed 120 characters"],
    },

    slug: {
      type: String,
      required: [true, "Plan slug is required"],
      trim: true,
      lowercase: true,
      maxlength: [140, "Plan slug cannot exceed 140 characters"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"],
    },

    type: {
      type: String,
      enum: Object.values(PLAN_TYPE),
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: null,
    },

    pricePerUser: {
      type: Number,
      required: [true, "Price per user is required"],
      min: [0, "Price cannot be negative"],
    },

    billingCycle: {
      type: String,
      enum: Object.values(PLAN_INTERVAL),
      default: PLAN_INTERVAL.MONTHLY,
    },

    modules: [
      {
        type: String,
        enum: Object.values(PLAN_MODULES),
      },
    ],

    features: {
      type: featureSchema,
      default: () => ({ ...DEFAULT_PLAN_FEATURES }),
    },

    /**
     * Hard resource limits for this plan.
     * These are enforced server-side when creating companies, branches, or adding users.
     */
    limits: {
      type: limitsSchema,
      default: () => ({ ...PLAN_LIMITS.FREE }),
    },

    featureItems: {
      type: [featureItemSchema],
      default: [],
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },

    neverExpires: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(PLAN_STATUS),
      default: PLAN_STATUS.ACTIVE,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const generatePlanCode = async () => {
  const Plan = mongoose.models.Plan;

  while (true) {
    const code = `${PLAN_CODE_PREFIX}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const exists = await Plan.exists({
      planCode: code,
      isDeleted: false,
    });

    if (!exists) {
      return code;
    }
  }
};

const createSlug = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

planSchema.pre("validate", async function () {
  if (!this.planCode) {
    this.planCode = await generatePlanCode();
  }

  if (!this.slug && this.name) {
    this.slug = createSlug(this.name);
  }

  // Auto-configure free plans — price and flags are always forced.
  // Limits are only seeded on creation; admin can override them via update.
  if (this.type === PLAN_TYPE.FREE) {
    this.isFree = true;
    this.neverExpires = true;
    this.pricePerUser = 0;

    // Only set default limits when creating a new free plan without explicit limits
    if (
      this.isNew &&
      (!this.limits ||
        (!this.limits.maxCompanies &&
          !this.limits.maxBranches &&
          !this.limits.maxUsers))
    ) {
      this.limits = { ...PLAN_LIMITS.FREE };
    }
  }
});

planSchema.methods.toSafeObject = function () {
  const plan = this.toObject();

  delete plan.__v;

  return plan;
};

planSchema.index(
  { planCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

planSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

planSchema.index({
  status: 1,
  isDeleted: 1,
});

planSchema.index({
  createdBy: 1,
});

planSchema.index({
  updatedBy: 1,
});

/**
 * Unique constraint: only ONE active plan per type is allowed at a time.
 * e.g. Cannot have two active "free" or two active "starter" plans.
 */
planSchema.index(
  { type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: PLAN_STATUS.ACTIVE,
    },
    name: "unique_active_plan_type",
  },
);

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export default Plan;
