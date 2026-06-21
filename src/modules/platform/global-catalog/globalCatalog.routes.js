import { Router } from "express";

import globalProductRoutes from "./products/routes/globalProduct.routes.js";
import hsnMasterRoutes from "./hsn-master/routes/hsnMaster.routes.js";
import manufacturerMasterRoutes from "./manufacturer-master/routes/manufacturerMaster.routes.js";
import uomMasterRoutes from "./uom-master/routes/uomMaster.routes.js";
import categoryMasterRoutes from "./category-master/routes/categoryMaster.routes.js";
import productFormMasterRoutes from "./product-form-master/routes/productFormMaster.routes.js";
import saltMasterRoutes from "./salt-master/routes/saltMaster.routes.js";

const router = Router();

router.use("/products", globalProductRoutes);
router.use("/hsn-master", hsnMasterRoutes);
router.use("/manufacturer-master", manufacturerMasterRoutes);
router.use("/uom-master", uomMasterRoutes);
router.use("/category-master", categoryMasterRoutes);
router.use("/product-form-master", productFormMasterRoutes);
router.use("/salt-master", saltMasterRoutes);

export default router;
