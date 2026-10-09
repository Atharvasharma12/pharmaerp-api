import { Router } from "express";
import {
  recordCustomerSale,
  getCustomerSales,
  getAllCustomerSales,
  updateCustomerSale,
  cancelCustomerSale,
} from "../controllers/invoice.controller.js";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";
import companyContextMiddleware from "../../../../middlewares/companyContext.middleware.js";

const router = Router();

// Apply standard middlewares
router.use(authMiddleware);
router.use(workspaceContextMiddleware);
router.use(companyContextMiddleware);

// Routes
router.get("/", getAllCustomerSales);
router.get("/customer/:customerId", getCustomerSales);
router.post("/customer/:customerId?", recordCustomerSale);
router.put("/customer/:invoiceId", updateCustomerSale);
router.put("/customer/:customerId/:invoiceId", updateCustomerSale);
router.put("/:invoiceId/cancel", cancelCustomerSale);

export default router;
