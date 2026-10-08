export const CASH_TRANSACTION_TYPE = {
  CASH_IN: "CASH_IN",           // Cash received (e.g. customer payment)
  CASH_OUT: "CASH_OUT",         // Cash paid out (e.g. vendor payment)
  EXPENSE: "EXPENSE",           // Direct expense paid from cash
  PETTY_CASH: "PETTY_CASH",     // Small petty cash expense
  ADJUSTMENT: "ADJUSTMENT",     // Adjustment for cash discrepancy
  OTHER: "OTHER",
};

export const CASH_TRANSACTION_DIRECTION = {
  CREDIT: "CREDIT",  // Money coming in (cash balance increases)
  DEBIT: "DEBIT",    // Money going out (cash balance decreases)
};

export const CASH_TRANSACTION_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  CANCELLED: "CANCELLED",
};
