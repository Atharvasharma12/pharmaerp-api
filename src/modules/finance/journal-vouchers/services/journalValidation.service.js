import ApiError from "../../../../utils/ApiError.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";
import financialPeriodRepository from "../../financial-periods/repositories/financialPeriod.repository.js";
import { calculateJournalTotals } from "../helpers/calculateJournalTotals.js";
import { validateDebitCreditBalance } from "../helpers/validateDebitCreditBalance.js";

const validateJournalLines = async (companyId, workspaceId, lines = [], voucherDate = new Date()) => {
  // Verify that the voucherDate falls within an active, open financial period
  const period = await financialPeriodRepository.findPeriodByDate(
    companyId,
    workspaceId,
    voucherDate,
    "YEAR"
  );

  if (!period) {
    throw new ApiError(
      400,
      `Voucher date (${new Date(voucherDate).toISOString().split("T")[0]}) does not fall within any configured Financial Period`
    );
  }

  if (period.status !== "OPEN") {
    throw new ApiError(
      400,
      `Cannot write transactions to Financial Period (${period.periodCode}) because it is ${period.status}`
    );
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    throw new ApiError(400, "A journal voucher must have at least 2 lines");
  }

  const { totalDebit, totalCredit } = calculateJournalTotals(lines);
  validateDebitCreditBalance(totalDebit, totalCredit);

  let hasDebit = false;
  let hasCredit = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    if (debit < 0 || credit < 0) {
      throw new ApiError(
        400,
        `Line ${i + 1}: Debit and credit amounts cannot be negative`
      );
    }

    if (debit > 0 && credit > 0) {
      throw new ApiError(
        400,
        `Line ${i + 1}: A line cannot have both debit and credit amounts`
      );
    }

    if (debit === 0 && credit === 0) {
      throw new ApiError(
        400,
        `Line ${i + 1}: A line must have either a debit or credit amount`
      );
    }

    if (debit > 0) hasDebit = true;
    if (credit > 0) hasCredit = true;

    // Validate account existence and scope
    const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
      line.accountId,
      companyId,
      workspaceId
    );
    if (!account) {
      throw new ApiError(
        404,
        `Line ${i + 1}: Account not found under this company`
      );
    }

    if (account.status !== "active") {
      throw new ApiError(
        400,
        `Line ${i + 1}: Account '${account.accountName}' is inactive`
      );
    }
  }

  if (!hasDebit || !hasCredit) {
    throw new ApiError(
      400,
      "Voucher must contain at least one debit and one credit line"
    );
  }

  return true;
};

export default {
  validateJournalLines,
};

