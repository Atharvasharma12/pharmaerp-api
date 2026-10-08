import { Router } from "express";
import shiftModule from "./shifts/shift.module.js";
import dayClosingModule from "./day-closings/dayClosing.module.js";
import businessDayModule from "./business-days/businessDay.module.js";

const router = Router();

router.use(shiftModule.path, shiftModule.router);
router.use(dayClosingModule.path, dayClosingModule.router);
router.use(businessDayModule.path, businessDayModule.router);

export default router;
