import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import CashDenominationBalance from "../models/cashDenominationBalance.model.js";

// ---------------------------------------------------------------------------
// FIND by cashAccountId
// ---------------------------------------------------------------------------
const findByCashAccountId = async (cashAccountId, options = {}) => {
  return CashDenominationBalance.findOne({ cashAccountId })
    .session(options.session || null);
};

// ---------------------------------------------------------------------------
// CREATE — called once when a cash account is first created with opening balance
// ---------------------------------------------------------------------------
const createBalance = async (payload, options = {}) => {
  const [balance] = await CashDenominationBalance.create([payload], {
    session: options.session || null,
  });
  return balance;
};

// ---------------------------------------------------------------------------
// VALIDATE SUFFICIENT DENOMINATIONS (pre-flight check before cash OUT)
//
// Throws ApiError 400 if any requested denomination:
//   • Does not exist in the current balance
//   • Has quantity > available quantity
// ---------------------------------------------------------------------------
const validateSufficientDenominations = async (
  cashAccountId,
  requestedDenominations,
  options = {},
) => {
  const balance = await CashDenominationBalance.findOne({ cashAccountId }).session(
    options.session || null,
  );

  if (!balance) {
    throw new ApiError(
      400,
      "Cash denomination balance not found for this account. " +
      "Ensure the cash account was created with an opening balance and denomination breakdown.",
    );
  }

  for (const requested of requestedDenominations) {
    const available = balance.denominations.find(
      (d) => d.denomination === requested.denomination,
    );
    const availableQty = available ? available.quantity : 0;

    if (requested.quantity > availableQty) {
      throw new ApiError(
        400,
        `Insufficient cash denomination: Only ${availableQty} note(s) of ₹${requested.denomination} available, ` +
        `but ${requested.quantity} were requested.`,
      );
    }
  }

  return true;
};

// ---------------------------------------------------------------------------
// ADD DENOMINATIONS (cash IN — opening balance, cash receive, fund transfer to cash)
// Merges incoming denominations into the running balance.
// ---------------------------------------------------------------------------
const addDenominations = async (
  cashAccountId,
  incomingDenominations,
  userId,
  options = {},
) => {
  const session = options.session || null;

  const balance = await CashDenominationBalance.findOne({ cashAccountId }).session(session);

  if (!balance) {
    throw new ApiError(
      500,
      "CashDenominationBalance document not found. Cannot add denominations.",
    );
  }

  // Merge: for each incoming denomination, find existing or add new
  const denoms = balance.denominations.map((d) => ({ ...d.toObject() }));

  for (const incoming of incomingDenominations) {
    const existing = denoms.find((d) => d.denomination === incoming.denomination);
    if (existing) {
      existing.quantity += incoming.quantity;
      existing.subtotal = existing.denomination * existing.quantity;
    } else {
      denoms.push({
        denomination: incoming.denomination,
        quantity: incoming.quantity,
        subtotal: incoming.denomination * incoming.quantity,
      });
    }
  }

  // Remove entries with 0 quantity to keep the array clean
  const cleanedDenoms = denoms.filter((d) => d.quantity > 0);

  // Sort by denomination descending (500, 200, 100, ...)
  cleanedDenoms.sort((a, b) => b.denomination - a.denomination);

  const totalBalance = cleanedDenoms.reduce((sum, d) => sum + d.subtotal, 0);

  balance.denominations = cleanedDenoms;
  balance.totalBalance = totalBalance;
  balance.lastUpdatedAt = new Date();
  balance.lastUpdatedBy = userId;

  await balance.save({ session });
  return balance;
};

// ---------------------------------------------------------------------------
// SUBTRACT DENOMINATIONS (cash OUT — cash payment, fund transfer from cash)
// Removes outgoing denominations from the running balance.
// Note: validateSufficientDenominations() MUST be called before this.
// ---------------------------------------------------------------------------
const subtractDenominations = async (
  cashAccountId,
  outgoingDenominations,
  userId,
  options = {},
) => {
  const session = options.session || null;

  const balance = await CashDenominationBalance.findOne({ cashAccountId }).session(session);

  if (!balance) {
    throw new ApiError(
      500,
      "CashDenominationBalance document not found. Cannot subtract denominations.",
    );
  }

  const denoms = balance.denominations.map((d) => ({ ...d.toObject() }));

  for (const outgoing of outgoingDenominations) {
    const existing = denoms.find((d) => d.denomination === outgoing.denomination);

    if (!existing || existing.quantity < outgoing.quantity) {
      // This should not happen if validateSufficientDenominations() was called,
      // but is a safety guard.
      throw new ApiError(
        400,
        `Cannot subtract ₹${outgoing.denomination} × ${outgoing.quantity}: ` +
        `only ${existing ? existing.quantity : 0} available.`,
      );
    }

    existing.quantity -= outgoing.quantity;
    existing.subtotal = existing.denomination * existing.quantity;
  }

  // Remove entries with 0 quantity
  const cleanedDenoms = denoms.filter((d) => d.quantity > 0);
  cleanedDenoms.sort((a, b) => b.denomination - a.denomination);

  const totalBalance = cleanedDenoms.reduce((sum, d) => sum + d.subtotal, 0);

  balance.denominations = cleanedDenoms;
  balance.totalBalance = totalBalance;
  balance.lastUpdatedAt = new Date();
  balance.lastUpdatedBy = userId;

  await balance.save({ session });
  return balance;
};

export default {
  findByCashAccountId,
  createBalance,
  validateSufficientDenominations,
  addDenominations,
  subtractDenominations,
};
