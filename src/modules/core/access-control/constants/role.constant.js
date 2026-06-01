// src/modules/core/access-control/constants/role.constant.js

export const SYSTEM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
  ACCOUNTANT: "accountant",
  INVENTORY_MANAGER: "inventory_manager",
  STAFF: "staff",
};

export const SYSTEM_ROLE_LABELS = {
  [SYSTEM_ROLES.OWNER]: "Owner",
  [SYSTEM_ROLES.ADMIN]: "Admin",
  [SYSTEM_ROLES.MANAGER]: "Manager",
  [SYSTEM_ROLES.PHARMACIST]: "Pharmacist",
  [SYSTEM_ROLES.CASHIER]: "Cashier",
  [SYSTEM_ROLES.ACCOUNTANT]: "Accountant",
  [SYSTEM_ROLES.INVENTORY_MANAGER]: "Inventory Manager",
  [SYSTEM_ROLES.STAFF]: "Staff",
};

export const SYSTEM_ROLE_DESCRIPTIONS = {
  [SYSTEM_ROLES.OWNER]:
    "Full workspace access including billing, subscription, users, companies, branches and settings",

  [SYSTEM_ROLES.ADMIN]:
    "Administrative access to workspace operations and team management",

  [SYSTEM_ROLES.MANAGER]:
    "Operational access for managing branches, inventory, purchases and sales",

  [SYSTEM_ROLES.PHARMACIST]:
    "Access to medicines, inventory, sales and pharmacy operations",

  [SYSTEM_ROLES.CASHIER]:
    "Access to POS billing, customers and sales transactions",

  [SYSTEM_ROLES.ACCOUNTANT]: "Access to billing, invoices, finance and reports",

  [SYSTEM_ROLES.INVENTORY_MANAGER]:
    "Access to products, stock, batches and inventory operations",

  [SYSTEM_ROLES.STAFF]: "Basic operational access with limited permissions",
};

export const SYSTEM_ROLE_CODES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  PHARMACIST: "PHARMACIST",
  CASHIER: "CASHIER",
  ACCOUNTANT: "ACCOUNTANT",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  STAFF: "STAFF",
};

export const ROLE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const DEFAULT_SYSTEM_ROLES = [
  SYSTEM_ROLES.OWNER,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.MANAGER,
  SYSTEM_ROLES.PHARMACIST,
  SYSTEM_ROLES.CASHIER,
  SYSTEM_ROLES.ACCOUNTANT,
  SYSTEM_ROLES.INVENTORY_MANAGER,
  SYSTEM_ROLES.STAFF,
];
