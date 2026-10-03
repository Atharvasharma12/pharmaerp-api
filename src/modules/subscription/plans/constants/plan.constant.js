export const PLAN_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
};

export const PLAN_INTERVAL = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

export const PLAN_TYPE = {
  FREE: "free",
  STARTER: "starter",
  BUSINESS: "business",
  ENTERPRISE: "enterprise",
};

export const PLAN_MODULES = {
  INVENTORY: "inventory",
  BILLING: "billing",
  POS: "pos",
  SALES: "sales",
  PURCHASE: "purchase",
  FINANCE: "finance",
  REPORTS: "reports",
  CRM: "crm",
  HRM: "hrm",
  GST: "gst",
  ECOMMERCE: "ecommerce",
};

/**
 * Hard limits every plan enforces.
 * Free plan defaults are the most restrictive.
 * Paid plans should override these when created.
 */
export const PLAN_LIMITS = {
  FREE: { maxCompanies: 1, maxBranches: 1, maxUsers: 1 },
  STARTER: { maxCompanies: 2, maxBranches: 5, maxUsers: 5 },
  BUSINESS: { maxCompanies: 5, maxBranches: 10, maxUsers: 10 },
  ENTERPRISE: { maxCompanies: 10, maxBranches: 50, maxUsers: 50 },
};

/** Default feature flags (UI-level capabilities, not limits) */
export const DEFAULT_PLAN_FEATURES = {
  customBranding: false,
  prioritySupport: false,
};

export const FREE_PLAN_SLUG = "free";

export const PLAN_CODE_PREFIX = "PLAN";
