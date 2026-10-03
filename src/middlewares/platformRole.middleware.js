import ApiError from "../utils/ApiError.js";

export const allowPlatformRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.platformUser) {
      throw new ApiError(401, "Platform authentication required");
    }

    if (!allowedRoles.includes(req.platformUser.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  };
};

export default allowPlatformRoles;
