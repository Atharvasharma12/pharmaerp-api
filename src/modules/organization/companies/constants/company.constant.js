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

export const DEFAULT_COMPANY_SETTINGS = {
  timezone: "Asia/Kolkata",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  defaultGstRate: 0,
};

export const DEFAULT_COMPANY_TAX_SETTINGS = {
  gstType: COMPANY_GST_TYPE.REGULAR,
  gstJurisdiction: null,
  defaultGstRate: DEFAULT_COMPANY_SETTINGS.defaultGstRate,
  isGstInclusive: false,
};

export const DEFAULT_COMPANY_BILLING_SETTINGS = {
  invoicePrefix: "INV",
  invoiceStartNumber: 1,
  purchasePrefix: "PUR",
  purchaseStartNumber: 1,
  creditNotePrefix: "CRN",
  debitNotePrefix: "DBN",
  barcodeFormat: "Code128",
  roundingType: "2 Decimal Places",
  printCompanyLogoOnInvoice: true,
  footerMessage: null,
};

export const DEFAULT_COMPANY_BUSINESS_SETTINGS = {
  allowNegativeStock: false,
  enableBatchWiseInventory: true,
  enableExpiryTracking: true,
  enableScheduleHTracking: true,
  enableNarcoticDrugTracking: true,
  enableSmsNotifications: true,
  enableWhatsappNotifications: true,
  enableEmailNotifications: true,
};

export const COMPANY_CODE_PREFIX = "CMP";
