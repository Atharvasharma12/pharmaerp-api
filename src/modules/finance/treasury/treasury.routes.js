import { Router } from "express";
import bankAccountModule from "./bank-management/bank-accounts/bankAccount.module.js";

const router = Router();

// Mount submodules
router.use(bankAccountModule.path, bankAccountModule.router);

export default router;
