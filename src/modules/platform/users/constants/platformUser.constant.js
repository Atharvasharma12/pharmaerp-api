import PLATFORM_ROLES from "../../../../constants/platformRoles.constant.js";

import PLATFORM_USER_STATUS from "../../../../constants/platformStatus.constant.js";

export const PLATFORM_USER_SORT_FIELDS = [
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
];

export const PLATFORM_USER_DEFAULT_SORT = {
  createdAt: -1,
};

export const PLATFORM_USER_SEARCH_FIELDS = ["name", "email"];

export const PLATFORM_USER_ALLOWED_UPDATE_FIELDS = [
  "name",
  "email",
  "role",
  "status",
  "avatar",
];

export const PLATFORM_USER_ALLOWED_ROLES = [
  PLATFORM_ROLES.SUPER_ADMIN,
  PLATFORM_ROLES.ADMIN,
  PLATFORM_ROLES.SUPPORT,
  PLATFORM_ROLES.BILLING_MANAGER,
  PLATFORM_ROLES.CATALOG_MANAGER,
  PLATFORM_ROLES.READ_ONLY,
];

export const PLATFORM_USER_ALLOWED_STATUSES = [
  PLATFORM_USER_STATUS.ACTIVE,
  PLATFORM_USER_STATUS.SUSPENDED,
  PLATFORM_USER_STATUS.INVITED,
];

export default {
  PLATFORM_USER_SORT_FIELDS,
  PLATFORM_USER_DEFAULT_SORT,
  PLATFORM_USER_SEARCH_FIELDS,
  PLATFORM_USER_ALLOWED_UPDATE_FIELDS,
  PLATFORM_USER_ALLOWED_ROLES,
  PLATFORM_USER_ALLOWED_STATUSES,
};
