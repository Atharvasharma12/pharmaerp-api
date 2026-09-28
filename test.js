import mongoose from 'mongoose';

(async () => {
  const uri = 'mongodb+srv://dev:dev%401234@erp-cluster.tqgbpyi.mongodb.net/erp?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  
  const SalesInvoice = mongoose.model('SalesInvoice', new mongoose.Schema({}, { strict: false }));
  
  const inv = await SalesInvoice.findOne().sort({ createdAt: -1 });
  console.log('Latest Invoice:', JSON.stringify(inv, null, 2));

  process.exit();
})();
