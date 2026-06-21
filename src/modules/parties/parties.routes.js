import { Router } from "express";
import customerModule from "./customers/customer.module.js";
import supplierModule from "./suppliers/supplier.module.js";

const router = Router();

router.use(customerModule.path, customerModule.router);
router.use(supplierModule.path, supplierModule.router);

export default router;
