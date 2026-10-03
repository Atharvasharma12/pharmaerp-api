const mongoose = require('mongoose');
const DB_URI = 'mongodb+srv://dev:dev%401234@erp-cluster.tqgbpyi.mongodb.net/erp?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  const Ledger = mongoose.connection.collection('ledgers');
  const AccountBalance = mongoose.connection.collection('accountbalances');
  
  const entries = await Ledger.find({}).toArray();
  const accMap = {};
  for(const e of entries) {
    const id = e.accountId.toString();
    if(!accMap[id]) accMap[id] = { debit: 0, credit: 0, date: e.voucherDate, cid: e.companyId, wid: e.workspaceId };
    accMap[id].debit += (e.debit || 0);
    accMap[id].credit += (e.credit || 0);
    if(e.voucherDate > accMap[id].date) accMap[id].date = e.voucherDate;
  }

  for(const id in accMap) {
    const o = accMap[id];
    let bal = 0, type = 'dr';
    if(o.debit >= o.credit) { bal = o.debit - o.credit; type = 'dr'; }
    else { bal = o.credit - o.debit; type = 'cr'; }
    
    await AccountBalance.updateOne(
      { accountId: new mongoose.Types.ObjectId(id) },
      { $set: { debitTotal: o.debit, creditTotal: o.credit, balance: bal, balanceType: type, lastTransactionAt: o.date } }
    );
  }
  
  console.log('Fixed', Object.keys(accMap).length, 'account balances.');
  process.exit(0);
}
run();
