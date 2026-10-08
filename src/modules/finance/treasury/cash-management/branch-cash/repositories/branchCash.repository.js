import mongoose from "mongoose";
import BranchCash from "../models/branchCash.model.js";
import BranchCashBalance from "../models/branchCashBalance.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge a denomination delta into an existing denominations array.
 * mode = "add" | "subtract"
 * Clamps to 0 on subtract (no negative quantities).
 * Self-heals any duplicate denomination entries in the existing array.
 */
const mergeDenominations = (existing, delta, mode) => {
  const map = new Map();
  (existing || []).forEach((d) => {
    const denom = Number(d.denomination);
    if (!isNaN(denom)) {
      const current = map.get(denom) || { denomination: denom, quantity: 0, subtotal: 0 };
      map.set(denom, {
        denomination: denom,
        quantity: current.quantity + (Number(d.quantity) || 0),
        subtotal: denom * (current.quantity + (Number(d.quantity) || 0)),
      });
    }
  });

  for (const d of delta || []) {
    const denom = Number(d.denomination);
    if (isNaN(denom)) continue;
    const qty = Number(d.quantity) || 0;
    const current = map.get(denom) || { denomination: denom, quantity: 0, subtotal: 0 };
    const newQty = mode === "add" ? current.quantity + qty : current.quantity - qty;
    map.set(denom, {
      denomination: denom,
      quantity: Math.max(0, newQty),
      subtotal: denom * Math.max(0, newQty),
    });
  }

  return [...map.values()]
    .filter((d) => d.quantity > 0)
    .sort((a, b) => b.denomination - a.denomination);
};

/**
 * Compute the running/frozen totals directly from denomination sums.
 * This is the canonical source of truth — no scalar fields are used.
 */
const computeTotals = (balance) => {
  if (!balance) return { runningTotal: 0, frozenTotal: 0 };
  const runningTotal = (balance.runningDenominations || []).reduce(
    (s, d) => s + (Number(d.denomination) || 0) * (Number(d.quantity) || 0),
    0,
  );
  const frozenTotal = (balance.frozenDenominations || []).reduce(
    (s, d) => s + (Number(d.denomination) || 0) * (Number(d.quantity) || 0),
    0,
  );
  return { runningTotal, frozenTotal };
};

// ─────────────────────────────────────────────────────────────────────────────
// READS
// ─────────────────────────────────────────────────────────────────────────────

const findByBranchId = async (branchId, companyId, options = {}) => {
  const { session } = options;
  const query = BranchCash.findOne({ branchId, companyId, isActive: true });
  if (session) query.session(session);
  return query.lean(false);
};

const findBalanceByBranchId = async (branchId, companyId, options = {}) => {
  const { session } = options;
  const query = BranchCashBalance.findOne({ branchId, companyId });
  if (session) query.session(session);
  return query.lean(false);
};

const findAllByCompany = async (workspaceId, companyId, options = {}) => {
  const { session } = options;
  const query = BranchCash.find({ workspaceId, companyId, isActive: true });
  if (session) query.session(session);
  return query.lean(false);
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / INITIALIZE
// ─────────────────────────────────────────────────────────────────────────────

const createBranchCash = async (payload, options = {}) => {
  const { session } = options;
  const [doc] = await BranchCash.create([payload], session ? { session } : {});
  return doc;
};

const createBranchCashBalance = async (payload, options = {}) => {
  const { session } = options;
  const [doc] = await BranchCashBalance.create(
    [payload],
    session ? { session } : {},
  );
  return doc;
};

// ─────────────────────────────────────────────────────────────────────────────
// DENOMINATION BALANCE MUTATIONS
// These are the ONLY mutations allowed — no scalar cash fields exist any more.
// All running/frozen totals are derived by summing denominations.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add denominations to the running partition.
 * Also recalculates and persists runningTotal from the merged denominations.
 */
const addRunningDenominations = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);
  if (!bal) return null;

  const merged = mergeDenominations(bal.runningDenominations, denominations, "add");
  const runningTotal = merged.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        runningDenominations: merged,
        runningTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

/**
 * Subtract denominations from the running partition.
 */
const subtractRunningDenominations = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);
  if (!bal) return null;

  const merged = mergeDenominations(bal.runningDenominations, denominations, "subtract");
  const runningTotal = merged.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        runningDenominations: merged,
        runningTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

/**
 * Add denominations to the frozen partition.
 */
const addFrozenDenominations = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);
  if (!bal) return null;

  const merged = mergeDenominations(bal.frozenDenominations, denominations, "add");
  const frozenTotal = merged.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        frozenDenominations: merged,
        frozenTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

/**
 * Subtract denominations from the frozen partition.
 */
const subtractFrozenDenominations = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);
  if (!bal) return null;

  const merged = mergeDenominations(bal.frozenDenominations, denominations, "subtract");
  const frozenTotal = merged.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        frozenDenominations: merged,
        frozenTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

/**
 * Move denominations from running → frozen (at shift close).
 * Subtracts specified denominations from running, adds them to frozen,
 * and recomputes both totals in one atomic document update.
 */
const moveDenominationsRunningToFrozen = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);
  if (!bal) return null;

  const newRunning = mergeDenominations(bal.runningDenominations, denominations, "subtract");
  const newFrozen = mergeDenominations(bal.frozenDenominations, denominations, "add");
  const runningTotal = newRunning.reduce((s, d) => s + d.subtotal, 0);
  const frozenTotal = newFrozen.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        runningDenominations: newRunning,
        runningTotal,
        frozenDenominations: newFrozen,
        frozenTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

/**
 * Replace running denominations wholesale (used at shift close when the
 * cashier's actual count differs from the system-recorded denominations).
 * The new running denominations ARE the carry-forward for the next shift.
 */
const setRunningDenominations = async (
  branchId,
  companyId,
  denominations,
  userId,
  options = {},
) => {
  const { session } = options;
  const merged = (denominations || [])
    .filter((d) => (Number(d.quantity) || 0) > 0)
    .map((d) => ({
      denomination: Number(d.denomination),
      quantity: Number(d.quantity),
      subtotal: Number(d.denomination) * Number(d.quantity),
    }))
    .sort((a, b) => b.denomination - a.denomination);

  const runningTotal = merged.reduce((s, d) => s + d.subtotal, 0);

  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    {
      $set: {
        runningDenominations: merged,
        runningTotal,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: userId,
      },
    },
    { new: true, session },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that frozen partition has sufficient denominations to cover a request.
 * Throws ApiError if any denomination is insufficient.
 */
const validateSufficientFrozenDenominations = async (
  branchId,
  companyId,
  denominations,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);

  const balMap = new Map(
    (bal?.frozenDenominations || []).map((d) => [d.denomination, d.quantity]),
  );

  for (const d of denominations) {
    const available = balMap.get(d.denomination) || 0;
    if (available < (d.quantity || 0)) {
      const { default: ApiError } = await import(
        "../../../../../../../utils/ApiError.js"
      );
      throw new ApiError(
        400,
        `Insufficient frozen denomination: need ${d.quantity}× ₹${d.denomination}, have ${available}`,
      );
    }
  }
};

/**
 * Validate that running partition has sufficient denominations to cover a request.
 */
const validateSufficientRunningDenominations = async (
  branchId,
  companyId,
  denominations,
  options = {},
) => {
  const { session } = options;
  const bal = await BranchCashBalance.findOne({ branchId, companyId }).session(session);

  const balMap = new Map(
    (bal?.runningDenominations || []).map((d) => [d.denomination, d.quantity]),
  );

  for (const d of denominations) {
    const available = balMap.get(d.denomination) || 0;
    if (available < (d.quantity || 0)) {
      const { default: ApiError } = await import(
        "../../../../../../../utils/ApiError.js"
      );
      throw new ApiError(
        400,
        `Insufficient running denomination: need ${d.quantity}× ₹${d.denomination}, have ${available}`,
      );
    }
  }
};

/**
 * Append an audit entry to the frozenLedger array.
 * Used by manualWithdraw, freezeAtShiftClose, and bankDepositSlip service.
 */
const pushFrozenLedgerEntry = async (
  branchId,
  companyId,
  entry,
  options = {},
) => {
  const { session } = options;
  return BranchCashBalance.findOneAndUpdate(
    { branchId, companyId },
    { $push: { frozenLedger: entry } },
    { new: true, session },
  );
};

export { computeTotals };

export default {
  // Reads
  findByBranchId,
  findBalanceByBranchId,
  findAllByCompany,
  // Creates
  createBranchCash,
  createBranchCashBalance,
  // Denomination-only mutations (single source of truth)
  addRunningDenominations,
  subtractRunningDenominations,
  addFrozenDenominations,
  subtractFrozenDenominations,
  moveDenominationsRunningToFrozen,
  setRunningDenominations,
  // Validation
  validateSufficientFrozenDenominations,
  validateSufficientRunningDenominations,
  // Audit
  pushFrozenLedgerEntry,
  // Helper
  computeTotals,
};
