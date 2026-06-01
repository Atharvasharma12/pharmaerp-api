export const BRANCH_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  DELETED: "deleted",
};

export const BRANCH_TYPE = {
  RETAIL: "retail",
  WHOLESALE: "wholesale",
  WAREHOUSE: "warehouse",
  CLINIC_PHARMACY: "clinic_pharmacy",
  HOSPITAL_PHARMACY: "hospital_pharmacy",
  ONLINE: "online",
  OTHER: "other",
};

export const BRANCH_CODE_PREFIX = "BR";

export const DEFAULT_BRANCH_SETTINGS = {
  timezone: "Asia/Kolkata",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",

  allowNegativeStock: false,
  allowBackdatedEntries: false,

  enableBatchTracking: true,
  enableExpiryTracking: true,

  enableRackTracking: true,

  enablePurchaseModule: true,
  enableSalesModule: true,
  enableInventoryModule: true,

  enablePosBilling: true,

  defaultGstRate: 0,
};

export const BRANCH_BILLING_TYPE = {
  GST: "gst",
  NON_GST: "non_gst",
};

export const BRANCH_INVENTORY_MODE = {
  INDEPENDENT: "independent",
  SHARED: "shared",
};

export const BRANCH_PRICE_MODE = {
  COMPANY_DEFAULT: "company_default",
  BRANCH_SPECIFIC: "branch_specific",
};
