// src/modules/core/access-control/constants/permission.constant.js

import { SYSTEM_ROLES } from "./role.constant.js";

export const PERMISSIONS = {
  // Workspace
  WORKSPACE_VIEW: "workspace:view",
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_DELETE: "workspace:delete",

  WORKSPACE_MEMBER_VIEW: "workspace-member:view",
  WORKSPACE_MEMBER_CREATE: "workspace-member:create",
  WORKSPACE_MEMBER_UPDATE: "workspace-member:update",
  WORKSPACE_MEMBER_DELETE: "workspace-member:delete",

  // Company
  COMPANY_VIEW: "company:view",
  COMPANY_CREATE: "company:create",
  COMPANY_UPDATE: "company:update",
  COMPANY_DELETE: "company:delete",

  // Branch
  BRANCH_VIEW: "branch:view",
  BRANCH_CREATE: "branch:create",
  BRANCH_UPDATE: "branch:update",
  BRANCH_DELETE: "branch:delete",

  // Roles
  ROLE_VIEW: "role:view",
  ROLE_CREATE: "role:create",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",

  // Products
  PRODUCT_VIEW: "product:view",
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_DELETE: "product:delete",

  // Categories
  CATEGORY_VIEW: "category:view",
  CATEGORY_CREATE: "category:create",
  CATEGORY_UPDATE: "category:update",
  CATEGORY_DELETE: "category:delete",

  // Inventory
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_UPDATE: "inventory:update",
  INVENTORY_DELETE: "inventory:delete",

  // Stock
  STOCK_VIEW: "stock:view",
  STOCK_CREATE: "stock:create",
  STOCK_UPDATE: "stock:update",
  STOCK_DELETE: "stock:delete",

  // Purchase
  PURCHASE_VIEW: "purchase:view",
  PURCHASE_CREATE: "purchase:create",
  PURCHASE_UPDATE: "purchase:update",
  PURCHASE_DELETE: "purchase:delete",

  PURCHASE_RETURN_VIEW: "purchase-return:view",
  PURCHASE_RETURN_CREATE: "purchase-return:create",
  PURCHASE_RETURN_UPDATE: "purchase-return:update",
  PURCHASE_RETURN_DELETE: "purchase-return:delete",

  // Sales
  SALE_VIEW: "sale:view",
  SALE_CREATE: "sale:create",
  SALE_UPDATE: "sale:update",
  SALE_DELETE: "sale:delete",

  SALES_RETURN_VIEW: "sales-return:view",
  SALES_RETURN_CREATE: "sales-return:create",
  SALES_RETURN_UPDATE: "sales-return:update",
  SALES_RETURN_DELETE: "sales-return:delete",

  // Customers
  CUSTOMER_VIEW: "customer:view",
  CUSTOMER_CREATE: "customer:create",
  CUSTOMER_UPDATE: "customer:update",
  CUSTOMER_DELETE: "customer:delete",

  // Suppliers
  SUPPLIER_VIEW: "supplier:view",
  SUPPLIER_CREATE: "supplier:create",
  SUPPLIER_UPDATE: "supplier:update",
  SUPPLIER_DELETE: "supplier:delete",

  // Billing
  BILL_VIEW: "bill:view",
  BILL_CREATE: "bill:create",
  BILL_UPDATE: "bill:update",
  BILL_DELETE: "bill:delete",

  POS_VIEW: "pos:view",
  POS_CREATE: "pos:create",

  // Finance
  PAYMENT_VIEW: "payment:view",
  PAYMENT_CREATE: "payment:create",
  PAYMENT_UPDATE: "payment:update",

  EXPENSE_VIEW: "expense:view",
  EXPENSE_CREATE: "expense:create",
  EXPENSE_UPDATE: "expense:update",
  EXPENSE_DELETE: "expense:delete",

  // Reports
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",

  // Subscription
  SUBSCRIPTION_VIEW: "subscription:view",

  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.OWNER]: ALL_PERMISSIONS,

  [SYSTEM_ROLES.ADMIN]: [
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_CREATE,
    PERMISSIONS.COMPANY_UPDATE,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_CREATE,
    PERMISSIONS.BRANCH_UPDATE,
    PERMISSIONS.WORKSPACE_MEMBER_VIEW,
    PERMISSIONS.WORKSPACE_MEMBER_CREATE,
    PERMISSIONS.WORKSPACE_MEMBER_UPDATE,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  [SYSTEM_ROLES.MANAGER]: [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.SALE_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],

  [SYSTEM_ROLES.PHARMACIST]: [
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.SALE_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.CUSTOMER_VIEW,
  ],

  [SYSTEM_ROLES.CASHIER]: [
    PERMISSIONS.SALE_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_CREATE,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
  ],

  [SYSTEM_ROLES.ACCOUNTANT]: [
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.REPORT_VIEW,
  ],

  [SYSTEM_ROLES.INVENTORY_MANAGER]: [
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_CREATE,
    PERMISSIONS.STOCK_UPDATE,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
  ],

  [SYSTEM_ROLES.STAFF]: [PERMISSIONS.DASHBOARD_VIEW],
};
