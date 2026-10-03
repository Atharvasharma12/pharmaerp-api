// ─────────────────────────────────────────────────────────────────────────────
// BranchCash Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The two cash partitions every branch has.
 * RUNNING  → operational cash (sales, exchanges, manual deposits)
 * FROZEN   → reserve cash (awaiting bank deposit or manual withdrawals)
 */
export const CASH_PARTITION = {
  RUNNING: "running",
  FROZEN: "frozen",
};

/**
 * Ledger account constants for the Branch Cash system account.
 * One "Branch Cash" ledger account is auto-created per branch.
 */
export const BRANCH_CASH_GROUP_CODE = "BRANCH_CASH_ACCOUNTS";
export const BRANCH_CASH_GROUP_NAME = "Branch Cash";

/**
 * Types used on CashTransaction records for manual deposit/withdraw operations.
 * (Reuses existing CASH_IN / CASH_OUT from cashTransaction.constant.js)
 */
export const BRANCH_CASH_OPERATION = {
  DEPOSIT:  "DEPOSIT",   // External cash deposited into running cash
  WITHDRAW: "WITHDRAW",  // Cash withdrawn from frozen cash
};
