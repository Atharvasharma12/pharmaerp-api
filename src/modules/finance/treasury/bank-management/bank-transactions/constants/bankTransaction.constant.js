export const BANK_TRANSACTION_TYPE = {
  DEPOSIT: "DEPOSIT",           // Cash deposited into bank
  WITHDRAWAL: "WITHDRAWAL",     // Cash withdrawn from bank
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  UPI: "UPI",
  CHEQUE: "CHEQUE",
  BANK_CHARGES: "BANK_CHARGES", // Bank fees, service charges
  INTEREST: "INTEREST",         // Interest credited by bank
  OTHER: "OTHER",
};

export const BANK_TRANSACTION_DIRECTION = {
  CREDIT: "CREDIT",  // Money coming in (bank balance increases)
  DEBIT: "DEBIT",    // Money going out (bank balance decreases)
};

export const BANK_TRANSACTION_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  CANCELLED: "CANCELLED",
};
