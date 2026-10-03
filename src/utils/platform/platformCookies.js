const PLATFORM_COOKIE_OPTIONS = {
  httpOnly: true,

  secure: process.env.NODE_ENV === "production",

  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",

  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const setPlatformAuthCookie = (res, token) => {
  res.cookie("platform_access_token", token, PLATFORM_COOKIE_OPTIONS);
};

export const clearPlatformAuthCookie = (res) => {
  res.clearCookie("platform_access_token", PLATFORM_COOKIE_OPTIONS);
};

export default {
  setPlatformAuthCookie,
  clearPlatformAuthCookie,
};
