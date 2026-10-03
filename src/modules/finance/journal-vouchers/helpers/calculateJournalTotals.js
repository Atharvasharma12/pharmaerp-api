export const calculateJournalTotals = (lines = []) => {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += Number(line.debit) || 0;
    totalCredit += Number(line.credit) || 0;
  }
  return { totalDebit, totalCredit };
};
