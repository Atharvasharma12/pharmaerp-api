import { Router } from "express";

import globalProductRoutes from "./products/routes/globalProduct.routes.js";

const router = Router();

router.use("/products", globalProductRoutes);

export default router;
