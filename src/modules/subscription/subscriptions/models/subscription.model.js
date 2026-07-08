import mongoose from "mongoose";

import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
  SUBSCRIPTION_BILLING_CYCLE,
  SUBSCRIPTION_RENEWAL_MODE,
  SUBSCRIPTION_PRORATION_MODE,
  SUBSCRIPTION_EXPIRY_BEHAVIOR,
  DEFAULT_SUBSCRIPTION_SETTINGS,
} from "../constants/subscription.constant.js";

import generateSubscriptionCode from "../../../../utils/subscription/generateSubscriptionCode.js";

const settingsSchema = new mongoose.Schema(
  {
    renewalMode: {
      type: String,
      enum: Object.values(SUBSCRIPTION_RENEWAL_MODE),
      default: DEFAULT_SUBSCRIPTION_SETTINGS.renewalMode,
    },

    prorationMode: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PRORATION_MODE),
      default: DEFAULT_SUBSCRIPTION_SETTINGS.prorationMode,
    },

    expiryBehavior: {
      type: String,
      enum: Object.values(SUBSCRIPTION_EXPIRY_BEHAVIOR),
      default: DEFAULT_SUBSCRIPTION_SETTINGS.expiryBehavior,
    },
  },
  { _id: false },
);

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan is required"],
      index: true,
    },

    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Purchased by is required"],
      index: true,
    },

    currentPlanSnapshot: {
      planCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },

      name: {
        type: String,
        trim: true,
        default: null,
      },

      type: {
        type: String,
        trim: true,
        default: null,
      },

      pricePerUser: {
        type: Number,
        min: 0,
        default: 0,
      },

      billingCycle: {
        type: String,
        enum: Object.values(SUBSCRIPTION_BILLING_CYCLE),
        default: SUBSCRIPTION_BILLING_CYCLE.MONTHLY,
      },

      modules: {
        type: [String],
        default: [],
      },

      features: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    billingCycle: {
      type: String,
      enum: Object.values(SUBSCRIPTION_BILLING_CYCLE),
      required: true,
      default: SUBSCRIPTION_BILLING_CYCLE.MONTHLY,
      index: true,
    },

    pricePerUser: {
      type: Number,
      required: [true, "Price per user is required"],
      min: [0, "Price cannot be negative"],
    },

    seatQuantity: {
      type: Number,
      required: [true, "Seat quantity is required"],
      min: [1, "Seat quantity must be at least 1"],
    },

    activeSeatCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    subtotalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PAYMENT_STATUS),
      default: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
      index: true,
    },

    startsAt: {
      type: Date,
      required: [true, "Subscription start date is required"],
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      // Not required for free/neverExpires plans
      required: [
        function () {
          return this.status !== SUBSCRIPTION_STATUS.FREE;
        },
        "Subscription expiry date is required",
      ],
      default: null,
      index: true,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    trialUsed: {
      type: Boolean,
      default: false,
      index: true,
    },

    trialStartedAt: {
      type: Date,
      default: null,
    },

    trialPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    renewedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancel reason cannot exceed 500 characters"],
      default: null,
    },

    nextPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    nextSeatQuantity: {
      type: Number,
      min: 1,
      default: null,
    },

    nextBillingCycle: {
      type: String,
      enum: Object.values(SUBSCRIPTION_BILLING_CYCLE),
      default: null,
    },

    downgradeScheduledAt: {
      type: Date,
      default: null,
    },

    settings: {
      type: settingsSchema,
      default: () => DEFAULT_SUBSCRIPTION_SETTINGS,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

subscriptionSchema.pre("validate", function () {
  if (!this.subscriptionCode) {
    this.subscriptionCode = generateSubscriptionCode();
  }
});

subscriptionSchema.methods.toSafeObject = function () {
  const subscription = this.toObject();

  delete subscription.__v;

  return subscription;
};

subscriptionSchema.index(
  { subscriptionCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

subscriptionSchema.index(
  { workspaceId: 1, status: 1 },
  {
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

subscriptionSchema.index({
  workspaceId: 1,
  trialUsed: 1,
});

subscriptionSchema.index({ workspaceId: 1, isDeleted: 1 });

subscriptionSchema.index({ planId: 1, isDeleted: 1 });

subscriptionSchema.index({ expiresAt: 1, status: 1 });

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
