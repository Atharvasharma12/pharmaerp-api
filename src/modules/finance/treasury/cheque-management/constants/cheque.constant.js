// Direction: who issued vs who received the cheque
export const CHEQUE_TYPE = {
  RECEIVED: "RECEIVED",  // Cheque received from a customer / party
  ISSUED: "ISSUED",      // Cheque issued to a vendor / party
};

// Lifecycle status of a cheque
export const CHEQUE_STATUS = {
  PENDING: "PENDING",       // Cheque in hand, not yet deposited / presented
  DEPOSITED: "DEPOSITED",   // Deposited into bank but not yet cleared
  CLEARED: "CLEARED",       // Bank has confirmed the funds
  BOUNCED: "BOUNCED",       // Cheque returned / dishonoured
  CANCELLED: "CANCELLED",   // Cheque voided before deposit
};
