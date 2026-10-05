/**
 * Migration Script: DayClosing → BusinessDay
 *
 * Purpose:
 *   - Copies all existing DayClosing documents into the new BusinessDay collection.
 *   - Sets status: 'closed' on all migrated records.
 *   - Maps the 3-date fields: businessDate ← date, actualOpenedAt ← createdAt, actualClosedAt ← closedAt.
 *   - Updates Shift.businessDayId for each shift that was in DayClosing.shifts[].
 *   - Updates BankDepositSlip.businessDayId ← old dayClosingId.
 *
 * Idempotent: Re-running will not duplicate records (skips if already migrated by _legacyDayClosingId).
 *
 * Usage:
 *   node src/scripts/migrate-dayclosing-to-businessday.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ── Minimal inline schemas for migration ──────────────────────────────────────
// We use minimal schemas here to avoid circular imports during migration.

const dayClosingSchema = new mongoose.Schema({}, { strict: false, collection: "dayclosings" });
const DayClosingLegacy = mongoose.model("DayClosingLegacy", dayClosingSchema);

const businessDaySchema = new mongoose.Schema({}, { strict: false, collection: "businessdays" });
const BusinessDayMigration = mongoose.model("BusinessDayMigration", businessDaySchema);

const shiftSchema = new mongoose.Schema({}, { strict: false, collection: "shifts" });
const ShiftMigration = mongoose.model("ShiftMigration", shiftSchema);

const bankDepositSlipSchema = new mongoose.Schema({}, { strict: false, collection: "bankdepositslips" });
const BankDepositSlipMigration = mongoose.model("BankDepositSlipMigration", bankDepositSlipSchema);

// ── Main migration function ────────────────────────────────────────────────────

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not set in environment. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const legacyDayClosings = await DayClosingLegacy.find({}).lean();
  console.log(`📄 Found ${legacyDayClosings.length} legacy DayClosing records to migrate.`);

  let migrated = 0;
  let skipped = 0;
  let shiftUpdates = 0;
  let slipUpdates = 0;

  for (const dc of legacyDayClosings) {
    // Idempotency check: skip if a BusinessDay already exists for this legacy ID
    const alreadyMigrated = await BusinessDayMigration.findOne({
      _legacyDayClosingId: dc._id,
    }).lean();

    if (alreadyMigrated) {
      skipped++;
      continue;
    }

    // Map the old DayClosing fields to the new BusinessDay structure
    const businessDayDoc = {
      _id: new mongoose.Types.ObjectId(), // New ID for the BusinessDay
      _legacyDayClosingId: dc._id,       // Reference to old ID for idempotency

      // Core tenant fields
      workspaceId: dc.workspaceId,
      companyId: dc.companyId,
      branchId: dc.branchId,
      financialPeriodId: dc.financialPeriodId || null,

      // ── 3-Date system ──────────────────────────────────────────────────────
      businessDate: dc.date,                          // The logical date
      actualOpenedAt: dc.createdAt || dc.date,        // When it was created
      actualClosedAt: dc.closedAt || dc.updatedAt,    // When it was closed

      // ── Numbering ──────────────────────────────────────────────────────────
      businessDayNo: dc.dayClosingNo
        ? dc.dayClosingNo.replace("DC-", "BD-")
        : `BD-MIGRATED-${dc._id.toString().slice(-6)}`,

      // ── Status ─────────────────────────────────────────────────────────────
      // All legacy records were either 'draft', 'closed', or 'cancelled'.
      // 'draft' → 'open' (but these are old, so treat as 'closed')
      status: dc.status === "cancelled" ? "cancelled" : "closed",

      // ── Shifts array ───────────────────────────────────────────────────────
      shifts: dc.shifts || [],

      // ── Financial aggregation fields (preserved as-is) ─────────────────────
      openingFloatAmount: dc.openingFloatAmount || 0,
      expectedClosingCashAmount: dc.expectedClosingCashAmount || 0,
      actualClosingCashAmount: dc.actualClosingCashAmount || 0,
      openingDenominations: dc.openingDenominations || [],
      closingDenominations: dc.closingDenominations || [],
      totalFundWithdrawals: dc.totalFundWithdrawals || 0,
      totalFundDeposits: dc.totalFundDeposits || 0,
      totalManualDeposits: dc.totalManualDeposits || 0,
      totalManualWithdrawals: dc.totalManualWithdrawals || 0,
      cashByShift: dc.cashByShift || [],
      cashDifferenceAmount: dc.cashDifferenceAmount || 0,

      // ── Audit ──────────────────────────────────────────────────────────────
      createdBy: dc.createdBy,
      closedBy: dc.approvedBy || null,
      note: dc.note || "",

      // ── Timestamps ─────────────────────────────────────────────────────────
      createdAt: dc.createdAt,
      updatedAt: dc.updatedAt,
    };

    await BusinessDayMigration.create(businessDayDoc);
    migrated++;

    // Update all Shifts that belonged to this DayClosing
    if (dc.shifts && dc.shifts.length > 0) {
      const result = await ShiftMigration.updateMany(
        { _id: { $in: dc.shifts } },
        { $set: { businessDayId: businessDayDoc._id } }
      );
      shiftUpdates += result.modifiedCount || 0;
    }

    // Update all BankDepositSlips that referenced this DayClosing
    const slipResult = await BankDepositSlipMigration.updateMany(
      { dayClosingId: dc._id },
      { $set: { businessDayId: businessDayDoc._id } }
    );
    slipUpdates += slipResult.modifiedCount || 0;
  }

  console.log("──────────────────────────────────────────────");
  console.log(`✅ Migration complete.`);
  console.log(`   Business Days migrated: ${migrated}`);
  console.log(`   Business Days skipped (already migrated): ${skipped}`);
  console.log(`   Shifts updated with businessDayId: ${shiftUpdates}`);
  console.log(`   Bank Deposit Slips updated with businessDayId: ${slipUpdates}`);
  console.log("──────────────────────────────────────────────");

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
