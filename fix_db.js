import mongoose from "mongoose";
import env from "./src/config/env.js";

const fixDb = async () => {
  try {
    await mongoose.connect(env.DB_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;

    // Fix AccountBalances
    const res1 = await db.collection("accountbalances").updateMany(
      { balanceType: "Dr" },
      { $set: { balanceType: "dr" } }
    );
    const res2 = await db.collection("accountbalances").updateMany(
      { balanceType: "Cr" },
      { $set: { balanceType: "cr" } }
    );
    console.log(`Fixed ${res1.modifiedCount} Dr AccountBalances and ${res2.modifiedCount} Cr AccountBalances.`);

    // Fix Accounts
    const res3 = await db.collection("accounts").updateMany(
      { openingBalanceType: "Dr" },
      { $set: { openingBalanceType: "dr" } }
    );
    const res4 = await db.collection("accounts").updateMany(
      { openingBalanceType: "Cr" },
      { $set: { openingBalanceType: "cr" } }
    );
    console.log(`Fixed ${res3.modifiedCount} Dr Accounts and ${res4.modifiedCount} Cr Accounts.`);

    // Fix Customers
    const res5 = await db.collection("customers").updateMany(
      { openingBalanceType: "Dr" },
      { $set: { openingBalanceType: "dr" } }
    );
    const res6 = await db.collection("customers").updateMany(
      { openingBalanceType: "Cr" },
      { $set: { openingBalanceType: "cr" } }
    );
    console.log(`Fixed ${res5.modifiedCount} Dr Customers and ${res6.modifiedCount} Cr Customers.`);

    // Fix Suppliers
    const res7 = await db.collection("suppliers").updateMany(
      { openingBalanceType: "Dr" },
      { $set: { openingBalanceType: "dr" } }
    );
    const res8 = await db.collection("suppliers").updateMany(
      { openingBalanceType: "Cr" },
      { $set: { openingBalanceType: "cr" } }
    );
    console.log(`Fixed ${res7.modifiedCount} Dr Suppliers and ${res8.modifiedCount} Cr Suppliers.`);

    console.log("Done.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

fixDb();
