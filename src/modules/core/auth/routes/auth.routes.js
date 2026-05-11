import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEmailOtp,
  verifyEmailOtp,
} from "../controllers/auth.controller.js";

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
} from "../validations/auth.validation.js";

const router = Router();

// public
router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post("/send-email-otp", validate(sendEmailOtpSchema), sendEmailOtp);

router.post(
  "/verify-email-otp",
  validate(verifyEmailOtpSchema),
  verifyEmailOtp,
);

// protected
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  changePassword,
);

router.post("/logout", authMiddleware, logout);

export default router;
