import { Router } from "express";
import chartOfAccountsModule from "./chart-of-accounts/chartOfAccounts.module.js";
import accountBalanceModule from "./account-balances/accountBalance.module.js";
import journalVoucherModule from "./journal-vouchers/journalVoucher.module.js";
import ledgerModule from "./ledger/ledger.module.js";
import financialPeriodModule from "./financial-periods/financialPeriod.module.js";

const router = Router();

// Mount chart of accounts routes
router.use(chartOfAccountsModule.path, chartOfAccountsModule.router);

// Mount account balances routes
router.use(accountBalanceModule.path, accountBalanceModule.router);

// Mount journal vouchers routes
router.use(journalVoucherModule.path, journalVoucherModule.router);

// Mount ledger routes
router.use(ledgerModule.path, ledgerModule.router);

// Mount financial periods routes
router.use(financialPeriodModule.path, financialPeriodModule.router);

export default router;




