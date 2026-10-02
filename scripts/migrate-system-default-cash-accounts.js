/**
 * Migration: Set isSystemDefault on existing branch primary cash accounts.
 *
 * Run: node scripts/migrate-system-default-cash-accounts.js
 *
 * Logic:
 * 1. Connect to MongoDB
 * 2. For each branch, find the isPrimary: true cash account
 * 3. Set isSystemDefault: true on it
 * 4. If no primary exists, warn — admin should create one manually
 *
 * Safe to run multiple times (idempotent).
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

// ---- Inline minimal schemas to avoid full app bootstrap ----
const cashAccountSchema = new mongoose.Schema({
  workspaceId: mongoose.Schema.Types.ObjectId,
  companyId: mongoose.Schema.Types.ObjectId,
  branchId: mongoose.Schema.Types.ObjectId,
  accountName: String,
  isPrimary: Boolean,
  isSystemDefault: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
});
const CashAccount =
  mongoose.models.CashAccount ||
  mongoose.model("CashAccount", cashAccountSchema);

const branchSchema = new mongoose.Schema({
  workspaceId: mongoose.Schema.Types.ObjectId,
  companyId: mongoose.Schema.Types.ObjectId,
  name: String,
  isDeleted: { type: Boolean, default: false },
});
const Branch =
  mongoose.models.Branch || mongoose.model("Branch", branchSchema);
// ------------------------------------------------------------

async function main() {
  const MONGO_URI = process.env.DB_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error(
      "ERROR: DB_URI environment variable is not set."
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const branches = await Branch.find({ isDeleted: false });
  console.log(`\nFound ${branches.length} branches to process.\n`);

  let updated = 0;
  let alreadySet = 0;
  let noAccount = 0;

  for (const branch of branches) {
    // Check if already migrated
    const alreadyDefault = await CashAccount.findOne({
      branchId: branch._id,
      isSystemDefault: true,
      isDeleted: false,
    });

    if (alreadyDefault) {
      alreadySet++;
      console.log(
        `[SKIP]    Branch "${branch.name}" — "${alreadyDefault.accountName}" already isSystemDefault.`
      );
      continue;
    }

    // Find primary account
    const primaryCA = await CashAccount.findOne({
      branchId: branch._id,
      isPrimary: true,
      isDeleted: false,
    });

    if (primaryCA) {
      await CashAccount.updateOne(
        { _id: primaryCA._id },
        { $set: { isSystemDefault: true } }
      );
      updated++;
      console.log(
        `[UPDATED] Branch "${branch.name}" => "${primaryCA.accountName}" set as isSystemDefault.`
      );
    } else {
      noAccount++;
      console.warn(
        `[WARN]    Branch "${branch.name}" has NO primary cash account. Create one manually.`
      );
    }
  }

  console.log("\n---------------------------------------");
  console.log(`Migration complete.`);
  console.log(`  Updated:      ${updated} accounts`);
  console.log(`  Already set:  ${alreadySet} accounts`);
  console.log(`  No account:   ${noAccount} branches (manual action needed)`);
  console.log("---------------------------------------\n");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
