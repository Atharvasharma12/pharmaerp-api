export const FUND_TRANSFER_TYPE = {
  BANK_TO_BANK: "BANK_TO_BANK",
  // CASH_TO_BANK removed — cash-to-bank deposits must go via BankDepositSlip (frozen partition)
  BANK_TO_CASH: "BANK_TO_CASH",
  // CASH_TO_CASH removed — cash-to-cash transfers are no longer supported
};


export const FUND_TRANSFER_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  CANCELLED: "CANCELLED",
};
