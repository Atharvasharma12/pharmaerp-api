export const normalizeJournalLines = (lines = []) => {
  return lines.map((line) => {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    return {
      ...line,
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
    };
  });
};

export default normalizeJournalLines;
