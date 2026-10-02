import { Router } from "express";
import bankAccountModule from "./bank-management/bank-accounts/bankAccount.module.js";
import bankTransactionModule from "./bank-management/bank-transactions/bankTransaction.module.js";
// cashAccountModule deprecated — replaced by branchCashModule
import branchCashModule from "./cash-management/branch-cash/branchCash.module.js";
import cashTransactionModule from "./cash-management/cash-transactions/cashTransaction.module.js";
import cashDenominationModule from "./cash-management/cash-denominations/cashDenomination.module.js";
import cashExchangeModule from "./cash-management/exchange-cash/cashExchange.module.js";
import fundTransferModule from "./fund-transfers/fundTransfer.module.js";
import paymentQrModule from "./payment-qr/paymentQr.module.js";
import chequeModule from "./cheque-management/cheque.module.js";
import bankDepositSlipModule from "./bank-deposit-slips/bankDepositSlip.module.js";

const router = Router();

// Mount submodules
router.use(bankAccountModule.path, bankAccountModule.router);
router.use(bankTransactionModule.path, bankTransactionModule.router);
router.use(branchCashModule.path, branchCashModule.router);
router.use(cashTransactionModule.path, cashTransactionModule.router);
router.use(cashDenominationModule.path, cashDenominationModule.router);
router.use(cashExchangeModule.path, cashExchangeModule.router);
router.use(fundTransferModule.path, fundTransferModule.router);
router.use(paymentQrModule.path, paymentQrModule.router);
router.use(chequeModule.path, chequeModule.router);
router.use(bankDepositSlipModule.path, bankDepositSlipModule.router);

export default router;
