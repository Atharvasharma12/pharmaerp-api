const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const setAuthCookie = (res, token) => {
  res.cookie("access_token", token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res) => {
  res.clearCookie("access_token", COOKIE_OPTIONS);
};
