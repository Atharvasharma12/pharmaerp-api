import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  removeMyAvatar,
  updateMyEmail,
  updateMyPhone,
  deleteMyAccount,
} from "../controllers/user.controller.js";

import {
  updateProfileSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updatePhoneSchema,
} from "../validations/user.validation.js";

const router = Router();

router.get("/me", authMiddleware, getMyProfile);

router.patch(
  "/me",
  authMiddleware,
  validate(updateProfileSchema),
  updateMyProfile,
);

router.patch(
  "/me/avatar",
  authMiddleware,
  validate(updateAvatarSchema),
  updateMyAvatar,
);

router.delete("/me/avatar", authMiddleware, removeMyAvatar);

router.patch(
  "/me/email",
  authMiddleware,
  validate(updateEmailSchema),
  updateMyEmail,
);

router.patch(
  "/me/phone",
  authMiddleware,
  validate(updatePhoneSchema),
  updateMyPhone,
);

router.delete("/me", authMiddleware, deleteMyAccount);

export default router;
