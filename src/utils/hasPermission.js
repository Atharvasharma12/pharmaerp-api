// src/utils/hasPermission.js

const normalizePermissions = (permissions) => {
  if (!permissions) return [];

  if (Array.isArray(permissions)) {
    return permissions;
  }

  return [permissions];
};

export const hasPermission = (
  userPermissions = [],
  requiredPermissions = [],
  options = {},
) => {
  const permissions = normalizePermissions(userPermissions);
  const required = normalizePermissions(requiredPermissions);

  if (!required.length) {
    return true;
  }

  if (permissions.includes("*")) {
    return true;
  }

  if (options.requireAll === true) {
    return required.every((permission) => permissions.includes(permission));
  }

  return required.some((permission) => permissions.includes(permission));
};

export const hasAllPermissions = (
  userPermissions = [],
  requiredPermissions = [],
) => {
  return hasPermission(userPermissions, requiredPermissions, {
    requireAll: true,
  });
};

export const hasAnyPermission = (
  userPermissions = [],
  requiredPermissions = [],
) => {
  return hasPermission(userPermissions, requiredPermissions, {
    requireAll: false,
  });
};

export const canAccess = hasPermission;

export default hasPermission;
