import invoiceRoutes from "./invoices/routes/invoice.routes.js";
import b2cLegacyImportRoutes from "./invoices/routes/b2cLegacyImport.routes.js";
import { Router } from "express";

const router = Router();

router.use("/invoices", invoiceRoutes);
router.use("/legacy-b2c-import", b2cLegacyImportRoutes);

export default {
  path: "/sales",
  router,
};
