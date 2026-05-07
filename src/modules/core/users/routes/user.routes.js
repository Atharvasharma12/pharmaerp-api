import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import authMiddleware from "../../../../middlewares/auth.middleware.js";

import {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  removeMyAvatar,
  getUsers,
  getUserById,
  updateUserStatus,
} from "../controllers/user.controller.js";

import {
  updateProfileSchema,
  updateAvatarSchema,
  updateUserStatusSchema,
} from "../validations/user.validation.js";

const router = Router();

// my profile
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

// users
router.get("/", authMiddleware, getUsers);

router.get("/:userId", authMiddleware, getUserById);

router.patch(
  "/:userId/status",
  authMiddleware,
  validate(updateUserStatusSchema),
  updateUserStatus,
);

export default router;
