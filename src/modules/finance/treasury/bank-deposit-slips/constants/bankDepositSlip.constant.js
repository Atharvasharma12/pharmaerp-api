/**
 * Lifecycle status of a Bank Deposit Slip.
 *
 * PREPARED  → Slip created, denominations bagged, cash deducted from cash account.
 *             Step 1 journal posted: Cash A/c Cr, Cash In Transit A/c Dr.
 * DEPOSITED → Bank has received the cash. Step 2 journal posted: Cash In Transit A/c Cr, Bank A/c Dr.
 * CANCELLED → Slip voided. All posted journals reversed, denominations returned.
 */
export const BANK_DEPOSIT_SLIP_STATUS = {
  PREPARED: "PREPARED",
  DEPOSITED: "DEPOSITED",
  CANCELLED: "CANCELLED",
};


/** Auto-generated slip number prefix: BDS-YYYY-NNNNN */
export const BANK_DEPOSIT_SLIP_NUMBER_PREFIX = "BDS";

/** System ledger account code for the Cash-In-Transit suspense account */
export const CASH_IN_TRANSIT_ACCOUNT_CODE = "SYS-CASH-IN-TRANSIT";
export const CASH_IN_TRANSIT_ACCOUNT_NAME = "Cash In Transit";
export const CASH_IN_TRANSIT_GROUP_CODE = "SYS-TRANSIT-ASSETS";
export const CASH_IN_TRANSIT_GROUP_NAME = "Transit Assets";
