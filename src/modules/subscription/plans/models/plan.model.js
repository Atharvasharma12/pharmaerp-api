import mongoose from "mongoose";

import {
  PLAN_STATUS,
  PLAN_INTERVAL,
  PLAN_TYPE,
  PLAN_MODULES,
  DEFAULT_PLAN_FEATURES,
  PLAN_CODE_PREFIX,
} from "../constants/plan.constant.js";

const featureSchema = new mongoose.Schema(
  {
    companiesUnlimited: {
      type: Boolean,
      default: DEFAULT_PLAN_FEATURES.companiesUnlimited,
    },

    branchesUnlimited: {
      type: Boolean,
      default: DEFAULT_PLAN_FEATURES.branchesUnlimited,
    },

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

const planSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
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
      default: () => DEFAULT_PLAN_FEATURES,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    trialDays: {
      type: Number,
      min: 0,
      default: 0,
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

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export default Plan;
