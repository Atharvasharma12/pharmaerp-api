import dotenv from "dotenv";

dotenv.config();

import connectDB from "../src/config/database.js";
import logger from "../src/config/logger.js";

import Plan from "../src/modules/subscription/plans/models/plan.model.js";

import {
  PLAN_TYPE,
  PLAN_STATUS,
  PLAN_MODULES,
  FREE_PLAN_SLUG,
} from "../src/modules/subscription/plans/constants/plan.constant.js";

const seedFreePlan = async () => {
  try {
    await connectDB();

    // Check if free plan already exists
    const existing = await Plan.findOne({
      slug: FREE_PLAN_SLUG,
      isDeleted: false,
    });

    if (existing) {
      logger.info("Free plan already exists — skipping seed.", {
        planId: existing._id,
        planCode: existing.planCode,
      });
      process.exit(0);
    }

    const freePlan = await Plan.create({
      name: "Free",
      slug: FREE_PLAN_SLUG,
      type: PLAN_TYPE.FREE,
      description: "Get started for free. No credit card required.",

      // Price is always 0 for free plan (enforced by model pre-validate hook too)
      pricePerUser: 0,
      billingCycle: "monthly",

      // Core modules included in free plan
      modules: [
        PLAN_MODULES.BILLING,
        PLAN_MODULES.POS,
        PLAN_MODULES.INVENTORY,
        PLAN_MODULES.GST,
      ],

      features: {
        companiesUnlimited: false,
        branchesUnlimited: false,
        customBranding: false,
        prioritySupport: false,
      },

      featureItems: [
        {
          key: "companies",
          label: "Companies",
          value: "1 Company",
          included: true,
          sortOrder: 1,
        },
        {
          key: "branches",
          label: "Branches",
          value: "1 Branch",
          included: true,
          sortOrder: 2,
        },
        {
          key: "users",
          label: "Users",
          value: "3 Users",
          included: true,
          sortOrder: 3,
        },
        {
          key: "pos_billing",
          label: "POS Billing",
          value: "Included",
          included: true,
          sortOrder: 4,
        },
        {
          key: "inventory",
          label: "Inventory",
          value: "Basic",
          included: true,
          sortOrder: 5,
        },
        {
          key: "gst_reports",
          label: "GST Reports",
          value: "Included",
          included: true,
          sortOrder: 6,
        },
        {
          key: "support",
          label: "Support",
          value: "Email Support",
          included: true,
          sortOrder: 7,
        },
      ],

      // Free plan flags (also auto-set by model pre-validate for type FREE)
      isFree: true,
      neverExpires: true,
      trialDays: 0,

      isPopular: false,
      sortOrder: 0,
      status: PLAN_STATUS.ACTIVE,
    });

    logger.info("✅ Free plan seeded successfully.", {
      planId: freePlan._id,
      planCode: freePlan.planCode,
      name: freePlan.name,
      slug: freePlan.slug,
    });

    process.exit(0);
  } catch (err) {
    logger.error("❌ Failed to seed free plan:", err);
    process.exit(1);
  }
};

seedFreePlan();
