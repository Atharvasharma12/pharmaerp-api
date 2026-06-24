import { Router } from "express";
import bankAccountModule from "./bank-management/bank-accounts/bankAccount.module.js";
import bankTransactionModule from "./bank-management/bank-transactions/bankTransaction.module.js";
import cashAccountModule from "./cash-management/cash-accounts/cashAccount.module.js";
import fundTransferModule from "./fund-transfers/fundTransfer.module.js";

const router = Router();

// Mount submodules
router.use(bankAccountModule.path, bankAccountModule.router);
router.use(bankTransactionModule.path, bankTransactionModule.router);
router.use(cashAccountModule.path, cashAccountModule.router);
router.use(fundTransferModule.path, fundTransferModule.router);

export default router;
