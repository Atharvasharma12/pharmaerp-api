import mongoose from "mongoose";

export const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

export const CashItemSchema = new mongoose.Schema(
  {
    denomination: {
      type: Number,
      required: true,
      enum: DENOMINATIONS,
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

export const defaultCashArray = () =>
  DENOMINATIONS.map((d) => ({ denomination: d, count: 0 }));

export const sumDenominations = (denoms = []) =>
  Array.isArray(denoms)
    ? denoms.reduce(
        (sum, item) =>
          sum + Number(item?.denomination || 0) * Number(item?.count || 0),
        0,
      )
    : 0;

export const BUCKETS = ["running", "reserved", "bank"];
export const MODES = ["IN", "OUT", "TRANSFER", "INFO"];

export const EVENT_TYPES = [
  "OPENING_FLOAT_IN",
  "SALE_CASH_IN",
  "RETURN_CASH_OUT",
  "EXPIRY_CASH_OUT",
  "CASH_DEPOSIT_IN",
  "CASH_WITHDRAWAL_OUT",
  "TRANSFER_BUCKET",
  "CASH_EXCHANGE_IN",
  "CASH_EXCHANGE_OUT",
  "BANK_SLIP_CREATED",
  "BANK_SLIP_UNPACKED",
  "BANK_DEPOSIT_OUT",
  "DAY_CLOSING_COUNT",
  "ADJUSTMENT_OVER",
  "ADJUSTMENT_SHORT",
];
