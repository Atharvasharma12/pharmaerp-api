// Type of physical bank slip
export const BANK_SLIP_TYPE = {
  CASH_DEPOSIT: "CASH_DEPOSIT",       // Cash deposited at bank counter
  CASH_WITHDRAWAL: "CASH_WITHDRAWAL", // Cash withdrawn at bank counter
};

// Status of the slip
export const BANK_SLIP_STATUS = {
  PENDING: "PENDING",     // Slip created, not yet submitted to bank
  SUBMITTED: "SUBMITTED", // Slip handed over at bank counter
  CONFIRMED: "CONFIRMED", // Bank confirmed the transaction
  REJECTED: "REJECTED",   // Bank rejected / returned the slip
  CANCELLED: "CANCELLED", // Slip voided before submission
};
