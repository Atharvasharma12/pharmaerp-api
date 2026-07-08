export const SUBSCRIPTION_STATUS = {
  FREE: "free",
  TRIAL: "trial",
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  SUSPENDED: "suspended",
  PENDING: "pending",
};

export const SUBSCRIPTION_PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
};

export const SUBSCRIPTION_BILLING_CYCLE = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

export const SUBSCRIPTION_ACTION = {
  PURCHASE: "purchase",
  START_TRIAL: "start_trial",
  RENEW: "renew",
  UPGRADE: "upgrade",
  DOWNGRADE: "downgrade",
  CHANGE_SEATS: "change_seats",
  CANCEL: "cancel",
};

export const SUBSCRIPTION_CHANGE_TYPE = {
  IMMEDIATE: "immediate",
  NEXT_BILLING_CYCLE: "next_billing_cycle",
};

export const SUBSCRIPTION_READ_ONLY_ALLOWED_ACTIONS = {
  VIEW_INVOICES: "view_invoices",
  VIEW_REPORTS: "view_reports",
  VIEW_COMPANIES: "view_companies",
  VIEW_BRANCHES: "view_branches",
  EXPORT_DATA: "export_data",
  RENEW_SUBSCRIPTION: "renew_subscription",
};

export const SUBSCRIPTION_BLOCKED_WRITE_ACTIONS = {
  CREATE_INVOICE: "create_invoice",
  POS_BILLING: "pos_billing",
  CREATE_PRODUCT: "create_product",
  ADD_USER: "add_user",
  INVENTORY_OPERATION: "inventory_operation",
  SALES_OPERATION: "sales_operation",
  FINANCE_OPERATION: "finance_operation",
};

export const SUBSCRIPTION_CODE_PREFIX = "SUB";

export const SUBSCRIPTION_TRIAL_DAYS_DEFAULT = 0;

export const SUBSCRIPTION_MIN_SEATS = 1;

export const SUBSCRIPTION_MAX_SEATS = 100000;

export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 0;

export const SUBSCRIPTION_EXPIRY_BEHAVIOR = {
  READ_ONLY: "read_only",
};

export const SUBSCRIPTION_RENEWAL_MODE = {
  MANUAL: "manual",
  AUTO: "auto",
};

export const SUBSCRIPTION_PRORATION_MODE = {
  NONE: "none",
  DAILY: "daily",
};

export const DEFAULT_SUBSCRIPTION_SETTINGS = {
  renewalMode: SUBSCRIPTION_RENEWAL_MODE.MANUAL,
  prorationMode: SUBSCRIPTION_PRORATION_MODE.DAILY,
  expiryBehavior: SUBSCRIPTION_EXPIRY_BEHAVIOR.READ_ONLY,
};
