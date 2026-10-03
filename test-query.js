import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb+srv://dev:dev%401234@erp-cluster.tqgbpyi.mongodb.net/erp?retryWrites=true&w=majority");
  const db = mongoose.connection.db;
  const shifts = await db.collection("shifts").find({}).toArray();
  console.log("Total shifts:", shifts.length);
  shifts.forEach(s => {
    console.log(`ShiftNo: ${s.shiftNo}, Date: ${s.date} (${typeof s.date}), Status: ${s.status}, Branch: ${s.branchId}`);
  });
  mongoose.disconnect();
}
run();
