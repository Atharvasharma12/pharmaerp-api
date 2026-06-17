import { Router } from "express";

import globalProductRoutes from "./products/routes/globalProduct.routes.js";
import hsnMasterRoutes from "./hsn-master/routes/hsnMaster.routes.js";

const router = Router();

router.use("/products", globalProductRoutes);
router.use("/hsn-master", hsnMasterRoutes);

export default router;
