import { Router } from "express";

import validate from "../../../../middlewares/validate.middleware.js";
import platformAuthMiddleware from "../../../../middlewares/platformAuth.middleware.js";

import { login, logout, me } from "../controllers/platformAuth.controller.js";

import { platformLoginSchema } from "../validations/platformAuth.validation.js";

const router = Router();

router.post("/login", validate(platformLoginSchema), login);

router.post("/logout", platformAuthMiddleware, logout);

router.get("/me", platformAuthMiddleware, me);

export default router;
