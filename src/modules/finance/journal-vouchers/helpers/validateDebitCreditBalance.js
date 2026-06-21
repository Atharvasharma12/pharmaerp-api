import ApiError from "../../../../utils/ApiError.js";

export const validateDebitCreditBalance = (totalDebit, totalCredit) => {
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.0001) {
    throw new ApiError(
      400,
      `Debit and Credit must be equal. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`
    );
  }
  if (totalDebit <= 0) {
    throw new ApiError(400, "Voucher total must be greater than zero");
  }
};
