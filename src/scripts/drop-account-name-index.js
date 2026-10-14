/**
 * Standalone Script: Drop Legacy Account Name Unique Index
 * 
 * Target Collection: erp.accounts
 * Target Index: companyId_1_accountName_1
 * 
 * Usage:
 *   node src/scripts/drop-account-name-index.js
 */

import mongoose from "mongoose";
import env from "../config/env.js";

async function run() {
  const mongoUri = env.DB_URI || process.env.DB_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("❌ MongoDB connection string not found. Please set DB_URI in your .env file.");
    process.exit(1);
  }

  console.log("⏳ Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const accountsCollection = mongoose.connection.collection("accounts");
  const indexes = await accountsCollection.indexes();
  console.log("\n📋 Existing indexes on 'accounts' collection:");
  indexes.forEach((idx) => {
    console.log(` - ${idx.name} : ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)})`);
  });

  const legacyIndex = indexes.find(
    (idx) => idx.name === "companyId_1_accountName_1" && idx.unique
  );

  if (legacyIndex) {
    console.log("\n⚠️ Found unique index 'companyId_1_accountName_1'. Dropping...");
    await accountsCollection.dropIndex("companyId_1_accountName_1");
    console.log("✅ Successfully dropped index 'companyId_1_accountName_1'!");
  } else {
    console.log("\n✨ Unique index 'companyId_1_accountName_1' does not exist or has already been dropped.");
  }

  console.log("\n🏁 Done! Closing database connection.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error running script:", err);
  process.exit(1);
});
