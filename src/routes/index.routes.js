import { Router } from "express";
import coreModule from "../modules/core/core.module.js";
import { API_PREFIX } from "../constants/app.constant.js";

const router = Router();

router.use(API_PREFIX + coreModule.path, coreModule.router);

export default router;
