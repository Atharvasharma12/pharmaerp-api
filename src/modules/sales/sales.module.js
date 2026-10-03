import invoiceRoutes from "./invoices/routes/invoice.routes.js";
import { Router } from "express";

const router = Router();

router.use("/invoices", invoiceRoutes);

export default {
  path: "/sales",
  router,
};
