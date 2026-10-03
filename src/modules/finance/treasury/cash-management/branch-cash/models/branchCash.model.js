import mongoose from "mongoose";

/**
 * BranchCash
 * ─────────────────────────────────────────────────────────────────────────────
 * One document per branch. Anchor record that links the branch to its ledger
 * account for journal entries.
 *
 * Cash amounts (running / frozen) are NO LONGER stored here as scalar fields.
 * They are derived exclusively from BranchCashBalance denomination sums so that
 * the physical count and the reported balance can never diverge.
 *
 *   runningTotal = SUM(runningDenominations[i].denomination × quantity)
 *   frozenTotal  = SUM(frozenDenominations[i].denomination  × quantity)
 *
 * All queries for the monetary balance must go via BranchCashBalance.
 * Only ledger linkage, active status and audit fields live here.
 */
const branchCashSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
      index: true,
    },

    // ── Ledger Link ────────────────────────────────────────────────────────
    // System ledger account for journal entries (auto-created on initialization)
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
  },
);

branchCashSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// One BranchCash document per branch per company (hard constraint)
branchCashSchema.index(
  { companyId: 1, branchId: 1 },
  { unique: true },
);

branchCashSchema.index({
  workspaceId: 1,
  companyId: 1,
  branchId: 1,
  isActive: 1,
});

const BranchCash =
  mongoose.models.BranchCash ||
  mongoose.model("BranchCash", branchCashSchema);

export default BranchCash;
