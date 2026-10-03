import ApiError from "../../../../utils/ApiError.js";

export const validateVoucherDate = (date) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid voucher date format");
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (parsedDate > tomorrow) {
    throw new ApiError(400, "Voucher date cannot be in the future");
  }

  return parsedDate;
};

export default validateVoucherDate;
