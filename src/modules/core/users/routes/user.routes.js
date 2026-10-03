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
  getMyActiveContext,
  updateMyActiveContext,
  deleteMyAccount,
} from "../controllers/user.controller.js";

import {
  updateProfileSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updatePhoneSchema,
  updateActiveContextSchema,
} from "../validations/user.validation.js";

const router = Router();

router.use(authMiddleware);

router.get("/me", getMyProfile);

router.patch("/me", validate(updateProfileSchema), updateMyProfile);

router.patch("/me/avatar", validate(updateAvatarSchema), updateMyAvatar);

router.delete("/me/avatar", removeMyAvatar);

router.patch("/me/email", validate(updateEmailSchema), updateMyEmail);

router.patch("/me/phone", validate(updatePhoneSchema), updateMyPhone);

router.get("/me/active-context", getMyActiveContext);

router.patch(
  "/me/active-context",
  validate(updateActiveContextSchema),
  updateMyActiveContext,
);

router.delete("/me", deleteMyAccount);

export default router;
