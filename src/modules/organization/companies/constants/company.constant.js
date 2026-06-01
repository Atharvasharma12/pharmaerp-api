export const COMPANY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  DELETED: "deleted",
};

export const COMPANY_TYPE = {
  PROPRIETORSHIP: "proprietorship",
  PARTNERSHIP: "partnership",
  LLP: "llp",
  PRIVATE_LIMITED: "private_limited",
  PUBLIC_LIMITED: "public_limited",
  OPC: "opc",
  TRUST: "trust",
  SOCIETY: "society",
  OTHER: "other",
};

export const COMPANY_LICENSE_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  PENDING: "pending",
};

export const COMPANY_GST_TYPE = {
  REGULAR: "regular",
  COMPOSITION: "composition",
  UNREGISTERED: "unregistered",
};

export const COMPANY_BILLING_TYPE = {
  GST: "gst",
  NON_GST: "non_gst",
};

export const DEFAULT_COMPANY_SETTINGS = {
  timezone: "Asia/Kolkata",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",

  billingType: COMPANY_BILLING_TYPE.GST,

  allowNegativeStock: false,
  allowBackdatedEntries: false,

  enableBatchTracking: true,
  enableExpiryTracking: true,

  enablePurchaseModule: true,
  enableSalesModule: true,
  enableInventoryModule: true,

  defaultGstRate: 0,
};

export const COMPANY_CODE_PREFIX = "CMP";
